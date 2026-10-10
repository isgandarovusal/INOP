const crypto = require('node:crypto');
const mongoose = require('mongoose');
const User = require('../models/user.model');
const { resourceFilter } = require('./hrResourceScope.service');
const { getPermissionScope } = require('../middleware/auth.middleware');
const transitions = Object.freeze({
  Applied: ['Screening', 'Shortlisted', 'Interview', 'Offered', 'Rejected'],
  Screening: ['Applied', 'Shortlisted', 'Interview', 'Offered', 'Rejected'],
  Shortlisted: ['Screening', 'Interview', 'Offered', 'Rejected'],
  Interview: ['Screening', 'Shortlisted', 'Offered', 'Rejected'],
  Offered: ['Interview', 'Hired', 'Rejected'], Hired: [], Rejected: [],
});
const substatuses = { Applied: ['', 'new', 'review-required'], Screening: ['', 'in-review', 'selected'], Shortlisted: ['', 'selected', 'contacted'],
  Interview: ['', 'scheduled', 'completed', 'no-show', 'rescheduled', 'cancelled'], Offered: ['', 'sent', 'accepted', 'declined'], Hired: ['', 'onboarding'], Rejected: ['', 'closed'] };
function failure(message, status = 400, code = 'INVALID_WORKFLOW') { const e = new Error(message); e.status = status; e.code = code; return e; }
function wallAt(milliseconds, timezone) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(milliseconds)).map(p => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}
function localTime(local, timezone) {
  if (typeof local !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) throw failure('Invalid interview local date.');
  const target = Date.parse(local + ':00Z');
  if (!Number.isFinite(target) || new Date(target).toISOString().slice(0, 16) !== local) throw failure('Invalid interview calendar date.');
  let at = target;
  for (let i = 0; i < 3; i++) { const wall = Date.parse(wallAt(at, timezone) + ':00Z'); at += target - wall; }
  if (wallAt(at, timezone) !== local) throw failure('This local time does not exist because of a timezone change.');
  // Repeated DST wall times require an explicitly offset timestamp.
  if ([-120, -90, -60, -30, 30, 60, 90, 120].some(minutes => wallAt(at + minutes * 60000, timezone) === local)) throw failure('Ambiguous local time: use an explicit offset timestamp.');
  return new Date(at);
}
function isoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) throw failure('A timestamp with an explicit timezone offset is required.');
  const local = value.slice(0, 16), calendar = new Date(local + ':00Z');
  if (!Number.isFinite(calendar.getTime()) || calendar.toISOString().slice(0, 16) !== local) throw failure('Invalid calendar date.');
  const d = new Date(value); if (!Number.isFinite(d.getTime())) throw failure('Invalid timestamp.'); return d;
}
async function interviewer(req, id, previous) {
  if (!mongoose.isObjectIdOrHexString(id)) throw failure('Invalid interviewer id.');
  const read = String(id) === req.user.id || String(id) === String(previous) ? {} : resourceFilter(req, 'user');
  if (!await User.exists({ $and: [{ _id: id, isActive: true }, read] })) throw failure('Interviewer is unavailable.', 404);
  return id;
}
async function prepareWorkflow(req, current) {
  const body = req.body, update = {};
  if (body.processingState !== undefined) throw failure('Processing state is server-managed.');
  if (body.reason !== undefined && (typeof body.reason !== 'string' || body.reason.length > 500)) throw failure('Invalid reason.');
  if (body.status !== undefined) {
    if (!transitions[body.status]) throw failure('Invalid application status.');
    if (body.status !== current.status && !transitions[current.status]?.includes(body.status)) {
      if (['Hired', 'Rejected'].includes(current.status) && body.reopen === true) {
        if (req.permission.scope !== 'all') throw failure('Reopening decisions requires global update authority.', 403);
        if (!body.reason?.trim()) throw failure('Reopening requires an explicit reason.');
      } else throw failure('Invalid status transition.');
    }
    update.status = body.status;
    if (body.status !== current.status) { update.stageEnteredAt = new Date(); update.substatus = ''; }
  }
  const status = update.status || current.status;
  if (body.substatus !== undefined) {
    if (!substatuses[status]?.includes(body.substatus)) throw failure('Invalid substatus for this stage.'); update.substatus = body.substatus;
  }
  if (body.notes !== undefined) { if (typeof body.notes !== 'string' || body.notes.length > 5000) throw failure('Invalid notes.'); update.notes = body.notes.trim(); }
  if (body.nextAction !== undefined) {
    if (body.nextAction === null) update.nextAction = null;
    else {
      const action = body.nextAction;
      if (!action || !['review', 'call', 'interview', 'offer', 'follow_up', 'none'].includes(action.kind) || (action.notes !== undefined && (typeof action.notes !== 'string' || action.notes.length > 500))) throw failure('Invalid next action.');
      update.nextAction = { kind: action.kind, dueAt: action.dueAt ? isoDate(action.dueAt) : null, notes: action.notes || '' };
    }
  }
  if (body.interview !== undefined) {
    if (body.interview === null) update.interview = null;
    else {
      const input = body.interview, row = { ...current.interview, ...input };
      if (status !== 'Interview') throw failure('Interview scheduling requires Interview stage.');
      if (typeof row.timezone !== 'string' || row.timezone.length > 80) throw failure('Invalid interview timezone.');
      try { wallAt(Date.now(), row.timezone); } catch { throw failure('Unknown interview timezone.'); }
      let startsAt;
      try { startsAt = input.localStart !== undefined ? localTime(input.localStart, row.timezone) : isoDate(String(row.startsAt instanceof Date ? row.startsAt.toISOString() : row.startsAt)); } catch (e) { throw failure(e.message); }
      const durationMinutes = row.durationMinutes ?? 30;
      if (!Number.isInteger(durationMinutes) || durationMinutes < 5 || durationMinutes > 480 || !['pending', 'passed', 'failed', 'no_show', 'cancelled'].includes(row.result || 'pending')) throw failure('Invalid interview duration or result.');
      update.interview = { startsAt, timezone: row.timezone, durationMinutes, interviewerId: await interviewer(req, row.interviewerId || req.user.id, current.interview?.interviewerId), result: row.result || 'pending' };
    }
  }
  if (body.assignedTo !== undefined) {
    if (req.permission.scope !== 'all') throw failure('Reassignment requires global application update authority.', 403);
    if (!body.reason?.trim()) throw failure('Reassignment requires a reason.');
    const id = await interviewer(req, body.assignedTo);
    const target = await User.findById(id).select('role');
    const scope = await getPermissionScope(target.role, 'application', 'read');
    if (!scope || scope === 'none') throw failure('Assignee must have application read authority.', 403);
    update.assignedTo = id;
  }
  if ((update.substatus ?? current.substatus) === 'scheduled' && !(update.interview === null ? null : update.interview || current.interview)?.startsAt) throw failure('Scheduled interviews require a date.');
  if (!Object.keys(update).length) throw failure('No workflow fields supplied.');
  return update;
}
function workflowSnapshot(value) {
  return { status: value.status, substatus: value.substatus || '', interview: value.interview || null, nextAction: value.nextAction || null, assignedTo: value.assignedTo || null, notes: value.notes || '' };
}
function commandHash(body) {
  return crypto.createHash('sha256').update(JSON.stringify(Object.fromEntries(['status', 'substatus', 'interview', 'nextAction', 'assignedTo', 'notes', 'reason', 'reopen'].filter(k => body[k] !== undefined).map(k => [k, body[k]])))).digest('hex');
}
function creationEvent(req) { return { id: crypto.randomUUID(), type: 'create', actor: req.user.id, at: new Date(), revision: 0, before: null, after: { status: 'Applied' }, reason: '' }; }
module.exports = { transitions, prepareWorkflow, workflowSnapshot, commandHash, creationEvent, localTime };
