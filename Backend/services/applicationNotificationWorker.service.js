const crypto = require('node:crypto');
const mongoose = require('mongoose');
const Application = require('../models/application.model');
const Candidate = require('../models/candidate.model');
const Job = require('../models/job.model');
const User = require('../models/user.model');
const Role = require('../models/role.model');
const { resourceFilter } = require('./hrResourceScope.service');
const { notifyCandidateStatus } = require('./candidateNotification.service');
const { getSmtpConfig } = require('./email.service');

const MAX_ATTEMPTS = 3, LEASE_MS = 90000, SEND_TIMEOUT_MS = 30000;
// SMTP provides at-least-once delivery. A stable Message-ID helps deduplication,
// but a crash after acceptance and before acknowledgement can still resend.
function createNotificationWorker({ send = notifyCandidateStatus, available = () => Boolean(getSmtpConfig()), now = () => new Date(), timeoutMs = SEND_TIMEOUT_MS } = {}) {
  let busy = false, timer;
  async function authority(actorId) {
    const actor = await User.findOne({ _id: actorId, isActive: true }).select('_id role departmentId').lean();
    const role = actor && await Role.findOne({ key: String(actor.role).toLowerCase(), isActive: true }).select('permissions').lean();
    if (!role) return null;
    return {
      req: { user: { id: String(actor._id), departmentId: actor.departmentId || '' }, authRole: role },
      snapshot: JSON.stringify([actor.role, actor.departmentId || '', role._id, role.permissions]),
    };
  }
  async function finish(row, event, token, values) {
    return Application.updateOne({ _id: row._id, events: { $elemMatch: { id: event.id, 'delivery.token': token } } },
      { $set: { 'events.$.delivery': { attempts: event.delivery.attempts || 0, ...Object.fromEntries(['priorAttempts','retryCount','retryActor'].filter(k=>event.delivery[k]!==undefined).map(k=>[k,event.delivery[k]])), ...values } } }, { timestamps: false });
  }
  async function claim() {
    const at = now(), token = crypto.randomUUID();
    const eligible = { $or: [
      { 'delivery.state': { $in: available() ? ['pending', 'blocked'] : ['pending'] }, $or: [{ 'delivery.nextAttemptAt': { $exists: false } }, { 'delivery.nextAttemptAt': { $lte: at } }] },
      { 'delivery.state': 'running', 'delivery.leaseUntil': { $lte: at } },
    ] };
    const row = await Application.findOneAndUpdate({ events: { $elemMatch: eligible } }, { $set: {
      'events.$.delivery.state': 'running', 'events.$.delivery.token': token, 'events.$.delivery.leaseUntil': new Date(at.getTime() + LEASE_MS),
    } }, { returnDocument: 'after', timestamps: false }).select('status substatus stageEnteredAt interview jobId candidateId createdBy assignedTo departmentId events').lean();
    const event = row?.events.find(e => e.delivery?.token === token);
    return event ? { row, event, token } : null;
  }
  async function process({ row, event, token }) {
    const isCurrent = value => value && value.status === event.after?.status && [...(value.events || [])].reverse().find(e => e.delivery && e.after?.status === value.status)?.id === event.id && !['cancelled', 'declined'].includes(value.substatus) && !(value.interview?.result === 'cancelled' && value.status === 'Interview');
    const stop = code => finish(row, event, token, { state: 'skipped', code, at: now() });
    const actorId = event.delivery.retryActor !== undefined ? event.delivery.retryActor : event.actor;
    if (!['status', 'workflow'].includes(event.type) || !mongoose.isObjectIdOrHexString(actorId) || !['Interview', 'Offered'].includes(event.after?.status)) return stop('INVALID_EVENT');
    if (!isCurrent(row)) return stop('STALE_WORKFLOW');
    const initial = await authority(actorId);
    if (!initial) return stop('AUTH_REVOKED');
    const req = initial.req;
    if (!await Application.exists({ $and: [{ _id: row._id }, resourceFilter(req, 'application', 'update')] })) return stop('AUTH_REVOKED');
    const [candidate, job] = await Promise.all([
      Candidate.findOne({ $and: [{ _id: row.candidateId }, resourceFilter(req, 'candidate')] }).select('_id name email').lean(),
      Job.findOne({ $and: [{ _id: row.jobId }, resourceFilter(req, 'recruitment')] }).select('_id title').lean(),
    ]);
    if (!candidate || !job) return stop('PARENT_SCOPE_REVOKED');
    if (!candidate.email?.trim()) return stop('MISSING_RECIPIENT');
    const canSend = available(), attempts = (event.delivery.attempts || 0) + 1;
    if (!canSend || attempts > MAX_ATTEMPTS) {
      // Preserve existing stale/access skip priority on paths that cannot send.
      const live = await Application.findOne({ $and: [{ _id: row._id }, resourceFilter(req, 'application', 'update')] }).select('status substatus interview events').lean();
      if (!live) return stop('AUTH_REVOKED');
      if (!isCurrent(live)) return stop('STALE_WORKFLOW');
      if (!canSend) return finish(row, event, token, { state: 'blocked', code: 'SMTP_NOT_CONFIGURED', at: now() });
      return finish(row, event, token, { state: 'failed', code: 'ATTEMPTS_EXHAUSTED', at: now() });
    }
    const counted = await Application.updateOne({ _id: row._id, events: { $elemMatch: { id: event.id, 'delivery.token': token } } }, { $set: { 'events.$.delivery.attempts': attempts } }, { timestamps: false });
    if (!counted.modifiedCount) return;
    // Resource reads are provisional until the actor/role is reloaded AFTER
    // every parent read and the attempt reservation. No stale grant may release
    // data to the sender. A denied reservation is restored by token-bound finish.
    const [live, currentCandidate, currentJob] = await Promise.all([
      Application.findOne({ $and: [{ _id: row._id, events: { $elemMatch: { id: event.id, 'delivery.token': token, 'delivery.state': 'running' } } }, resourceFilter(req, 'application', 'update')] }).select('status substatus interview events candidateId jobId').lean(),
      Candidate.findOne({ $and: [{ _id: row.candidateId }, resourceFilter(req, 'candidate')] }).select('_id name email').lean(),
      Job.findOne({ $and: [{ _id: row.jobId }, resourceFilter(req, 'recruitment')] }).select('_id title').lean(),
    ]);
    const current = await authority(actorId);
    // Equality verifies that the fresh resource filters used the same authority
    // as the current server record. Any in-flight grant change fails closed.
    if (!current || current.snapshot !== initial.snapshot || !live) return stop('AUTH_REVOKED');
    if (!isCurrent(live) || String(live.candidateId) !== String(row.candidateId) || String(live.jobId) !== String(row.jobId)) return stop('STALE_WORKFLOW');
    if (!currentCandidate || !currentJob) return stop('PARENT_SCOPE_REVOKED');
    if (!currentCandidate.email?.trim()) return stop('MISSING_RECIPIENT');
    // No more DB awaits before invoking send. This remains a checkpoint, not an
    // atomic transaction with SMTP; later revocation cannot retract accepted mail.
    event.delivery.attempts = attempts;
    const controller = new AbortController(); let deadline;
    try {
      const result = await Promise.race([
        send({ application: { ...row, candidateId: currentCandidate, jobId: currentJob }, actor: current.req.user, signal: controller.signal, messageId: `<inop-${event.id}@notifications.invalid>` }),
        new Promise((_, reject) => { deadline = setTimeout(() => { controller.abort(); reject(Error('SEND_TIMEOUT')); }, timeoutMs); }),
      ]);
      if (result.sent) return finish(row, event, token, { state: 'sent', code: 'DELIVERED', sentAt: now() });
      if (result.skipped && result.code === 'SMTP_NOT_CONFIGURED') return finish(row, event, token, { state: 'blocked', code: result.code, at: now(), nextAttemptAt: new Date(now().getTime() + 300000) });
      throw Error('DELIVERY_FAILED');
    } catch {
      return finish(row, event, token, { state: attempts >= MAX_ATTEMPTS ? 'failed' : 'pending', code: controller.signal.aborted ? 'SEND_TIMEOUT' : 'DELIVERY_FAILED', at: now(),
        ...(attempts < MAX_ATTEMPTS ? { nextAttemptAt: new Date(now().getTime() + [60000, 300000][attempts - 1]) } : {}) });
    } finally { clearTimeout(deadline); }
  }
  async function runOnce(limit = 5) {
    if (busy) return { processed: 0, busy: true };
    busy = true; let processed = 0;
    try { for (; processed < Math.max(1, Math.min(Number(limit) || 5, 10)); processed++) { const work = await claim(); if (!work) break; await process(work); } return { processed }; }
    finally { busy = false; }
  }
  function start() {
    if (timer) return;
    timer = setInterval(() => { void runOnce().catch(() => console.error('Application notification worker: temporary processing failure.')); }, 5000); timer.unref();
  }
  function stop() { clearInterval(timer); timer = undefined; }
  return { runOnce, start, stop };
}
module.exports = { createNotificationWorker, MAX_ATTEMPTS, LEASE_MS, SEND_TIMEOUT_MS };
