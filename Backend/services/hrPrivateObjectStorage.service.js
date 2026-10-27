const crypto = require('node:crypto');
const net = require('node:net');
const dns = require('node:dns/promises');
const https = require('node:https');
const MAX_BYTES = 5 * 1024 * 1024, TIMEOUT_MS = 8000;
const MIME = new Set(['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']);
const fail = (code, status = 503) => Object.assign(new Error('Private storage operation is unavailable.'), { code, status });
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
let active = 0;
const safeCodes = new Set(['STORAGE_INVALID_REFERENCE','STORAGE_IDENTITY_MISMATCH','STORAGE_ABORTED','STORAGE_NETWORK_DENIED','STORAGE_UNAVAILABLE','STORAGE_NOT_FOUND','STORAGE_WRITE_CONFLICT','STORAGE_RESPONSE_LIMIT','STORAGE_WRITE_UNCERTAIN','STORAGE_TIMEOUT']);
const keys = new Set(['provider', 'key', 'sha256', 'size', 'mimeType']);
function reference(value) {
  if (!value || Object.getPrototypeOf(value) !== Object.prototype || Object.keys(value).length !== 5 || Object.keys(value).some(k => !keys.has(k)) || value.provider !== 's3' ||
      !/^hr\/cv\/[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(value.key || '') ||
      !/^[a-f0-9]{64}$/.test(value.sha256 || '') || !Number.isInteger(value.size) || value.size < 1 || value.size > MAX_BYTES || !MIME.has(value.mimeType)) throw fail('STORAGE_INVALID_REFERENCE', 400);
  return Object.freeze({ ...value });
}
function prepare(bytes, mimeType) {
  if (!Buffer.isBuffer(bytes) || !bytes.length || bytes.length > MAX_BYTES || !MIME.has(mimeType)) throw fail('STORAGE_INVALID_INPUT', 400);
  return reference({ provider: 's3', key: 'hr/cv/' + crypto.randomUUID(), sha256: digest(bytes), size: bytes.length, mimeType });
}
const blocked = new net.BlockList();
for (const [ip, prefix] of [['0.0.0.0',8],['10.0.0.0',8],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.168.0.0',16],['100.64.0.0',10],['192.0.0.0',24],['192.0.2.0',24],['198.18.0.0',15],['198.51.100.0',24],['203.0.113.0',24],['224.0.0.0',4],['240.0.0.0',4]]) blocked.addSubnet(ip,prefix,'ipv4');
for (const [ip, prefix] of [['::',96],['64:ff9b::',96],['64:ff9b:1::',48],['2002::',16],['2001::',32],['::1',128],['fc00::',7],['fe80::',10],['ff00::',8],['2001:db8::',32]]) blocked.addSubnet(ip,prefix,'ipv6');
function publicAddress(address) {
  const family = net.isIP(address);
  const normalized = family === 6 ? new URL('http://[' + address + ']').hostname.slice(1,-1) : address;
  return Boolean(family && !normalized.startsWith('::ffff:') && !blocked.check(address, family === 4 ? 'ipv4' : 'ipv6'));
}
function configValue(input) {
  let endpoint;
  try { endpoint = new URL(input.endpoint); } catch { throw fail('STORAGE_INVALID_CONFIG'); }
  const host = endpoint.hostname;
  if (input.provider !== 's3' || endpoint.protocol !== 'https:' || endpoint.username || endpoint.password || endpoint.search || endpoint.hash || endpoint.pathname !== '/' || endpoint.port ||
      host.length > 253 || !host.includes('.') || net.isIP(host) || !host.split('.').every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)) || /(^|\.)(localhost|local|internal|test|invalid)$/.test(host) || /(^|\.)r2\.dev$/.test(host) ||
      !/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(input.bucket || '') || !/^[a-z0-9-]{1,40}$/.test(input.region || '') ||
      !/^[A-Za-z0-9_-]{3,128}$/.test(input.accessKeyId || '') || typeof input.secretAccessKey !== 'string' || input.secretAccessKey.length < 8 || input.secretAccessKey.length > 256 ||
      // eslint-disable-next-line no-control-regex -- Reject credential header injection; intentional control-character validation.
      /[\x00-\x1f\x7f]/.test(input.secretAccessKey) || (input.sessionToken !== undefined && (typeof input.sessionToken !== 'string' || input.sessionToken.length > 4096 || /[\x00-\x1f\x7f]/.test(input.sessionToken)))) throw fail('STORAGE_INVALID_CONFIG');
  return Object.freeze({ ...input, endpoint: endpoint.origin });
}
const hmac = (key, text) => crypto.createHmac('sha256', key).update(text).digest();
function sign(config, method, blob, at, body, options = {}) {
  const timestamp = at.toISOString().replace(/[:-]|\.\d{3}/g, ''), date = timestamp.slice(0,8);
  const url = new URL(config.endpoint + '/' + config.bucket + '/' + blob.key);
  const encode = value => encodeURIComponent(value).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
  const query = Object.entries(options.query || {}).map(([key,value]) => [encode(key),encode(String(value))]).sort(([a,av],[b,bv]) => a < b ? -1 : a > b ? 1 : av < bv ? -1 : av > bv ? 1 : 0).map(pair => pair.join('=')).join('&');
  url.search = query;
  const headers = { host: url.host, 'x-amz-date': timestamp, 'x-amz-content-sha256': digest(body || Buffer.alloc(0)) };
  if (config.sessionToken) headers['x-amz-security-token'] = config.sessionToken;
  if (method === 'PUT') {
    Object.assign(headers, { 'content-type': blob.mimeType, 'cache-control': 'private, no-store', 'if-none-match': '*', 'x-amz-meta-sha256': blob.sha256 });
    // R2 encrypts every object at rest but rejects the S3 SSE-S3 request header.
    // Limit this compatibility exception to the official account API endpoint;
    // generic/custom S3 endpoints retain the existing explicit AES256 request.
    if (!/^[a-f0-9]{32}\.r2\.cloudflarestorage\.com$/.test(url.hostname)) headers['x-amz-server-side-encryption'] = 'AES256';
  }
  Object.assign(headers, options.headers || {});
  const names = Object.keys(headers).sort(), signed = names.join(';');
  const canonical = [method,url.pathname,query, names.map(k => k + ':' + headers[k].trim() + '\n').join(''), signed,headers['x-amz-content-sha256']].join('\n');
  const scope = date + '/' + config.region + '/s3/aws4_request';
  const key = hmac(hmac(hmac(hmac('AWS4' + config.secretAccessKey,date),config.region),'s3'),'aws4_request');
  const signature = crypto.createHmac('sha256',key).update(['AWS4-HMAC-SHA256',timestamp,scope,digest(canonical)].join('\n')).digest('hex');
  headers.authorization = 'AWS4-HMAC-SHA256 Credential=' + config.accessKeyId + '/' + scope + ', SignedHeaders=' + signed + ', Signature=' + signature;
  return { url: url.href, method, headers, body };
}
async function nativeTransport(options) {
  const url = new URL(options.url), addresses = await dns.lookup(url.hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(row => !publicAddress(row.address))) throw fail('STORAGE_NETWORK_DENIED');
  if (options.signal.aborted) throw fail('STORAGE_ABORTED', 499);
  const address = addresses[0];
  return new Promise((resolve, reject) => {
    const request = https.request(url, { method: options.method, headers: options.headers, signal: options.signal, agent: false,
      // Pin the validated DNS answer to prevent rebinding between validation and connect.
      lookup: (_host, opts, callback) => opts.all ? callback(null, [address]) : callback(null,address.address,address.family),
    }, response => resolve({ status: response.statusCode, headers: response.headers, body: response }));
    request.once('error', reject); request.end(options.body);
  });
}
function createStore(input, { transport = nativeTransport, now = () => new Date(), timeoutMs = TIMEOUT_MS } = {}) {
  const config = configValue(input);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > TIMEOUT_MS) throw fail('STORAGE_INVALID_CONFIG');
  async function operation(method, blob, bytes, signal) {
    blob = reference(blob);
    if (method === 'PUT' && !Buffer.isBuffer(bytes)) throw fail('STORAGE_IDENTITY_MISMATCH', 409);
    if (bytes && Buffer.isBuffer(bytes)) bytes = Buffer.from(bytes); // Immutable snapshot before any await.
    if (bytes && (!Buffer.isBuffer(bytes) || bytes.length !== blob.size || digest(bytes) !== blob.sha256)) throw fail('STORAGE_IDENTITY_MISMATCH', 409);
    if (signal?.aborted) throw fail('STORAGE_ABORTED', 499);
    if (active >= 2) throw fail('STORAGE_BUSY');
    active++;
    const controller = new AbortController(), abort = () => controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    let timer, response, timedOut = false;
    try {
      const work = async () => {
        response = await transport({ ...sign(config,method,blob,now(),bytes), signal: controller.signal });
        if (controller.signal.aborted) throw fail('STORAGE_ABORTED', 499);
        if (!response || !Number.isInteger(response.status)) throw fail('STORAGE_UNAVAILABLE');
        // Do not parse/echo provider error bodies, redirects, credentials or keys.
        if (response.status === 404) throw fail('STORAGE_NOT_FOUND', 404);
        if ([409,412].includes(response.status)) throw fail('STORAGE_WRITE_CONFLICT', 409);
        if (response.status !== 200) throw fail('STORAGE_UNAVAILABLE');
        const chunks = []; let size = 0;
        for await (const chunk of response.body || []) {
          if (controller.signal.aborted) throw fail('STORAGE_ABORTED', 499);
          const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          size += buffer.length;
          if (size > (method === 'GET' ? blob.size : 4096)) throw fail('STORAGE_RESPONSE_LIMIT');
          if (method === 'GET') chunks.push(buffer);
        }
        if (controller.signal.aborted) throw fail('STORAGE_ABORTED', 499);
        if (method !== 'GET') return blob;
        const result = Buffer.concat(chunks,size);
        if (size !== blob.size || digest(result) !== blob.sha256) throw fail('STORAGE_IDENTITY_MISMATCH', 409);
        return result;
      };
      return await Promise.race([work(), new Promise((_, reject) => {
        timer = setTimeout(() => { timedOut = true; controller.abort(); reject(fail(method === 'PUT' ? 'STORAGE_WRITE_UNCERTAIN' : 'STORAGE_TIMEOUT')); },timeoutMs);
        controller.signal.addEventListener('abort', () => reject(fail(timedOut && method === 'PUT' ? 'STORAGE_WRITE_UNCERTAIN' : timedOut ? 'STORAGE_TIMEOUT' : 'STORAGE_ABORTED', timedOut ? 503 : 499)), { once: true });
      })]);
    } catch (error) {
      if (safeCodes.has(error?.code)) throw fail(error.code, error.code === 'STORAGE_NOT_FOUND' ? 404 : error.code === 'STORAGE_WRITE_CONFLICT' || error.code === 'STORAGE_IDENTITY_MISMATCH' ? 409 : error.code === 'STORAGE_ABORTED' ? 499 : 503);
      throw fail(method === 'PUT' ? 'STORAGE_WRITE_UNCERTAIN' : 'STORAGE_UNAVAILABLE');
    } finally { active--; clearTimeout(timer); signal?.removeEventListener('abort',abort); try { response?.body?.destroy?.(); } catch { /* Cleanup must not echo provider error objects. */ } }
  }
  // Signed HeadBucket only: no object key, listing, body reads, writes or retries.
  async function checkConnection() {
    if (active >= 2) throw fail('STORAGE_BUSY');
    active++;
    const controller = new AbortController();
    let timer;
    try {
      const work = async () => {
        const response = await transport({ ...sign(config,'HEAD',{key:''},now()), signal:controller.signal });
        try {
          if (controller.signal.aborted || response?.status !== 200) throw fail('STORAGE_UNAVAILABLE');
          return true;
        } finally { try { response?.body?.destroy?.(); } catch { /* Never echo provider metadata. */ } }
      };
      return await Promise.race([work(), new Promise((_,reject) => {
        timer=setTimeout(() => { controller.abort();reject(fail('STORAGE_TIMEOUT')); },timeoutMs);
      })]);
    } catch { throw fail('STORAGE_UNAVAILABLE'); }
    finally { active--;clearTimeout(timer); }
  }
  // Resource authorization must occur in the server caller, never from a key.
  return Object.freeze({ put: (blob, bytes, options = {}) => operation('PUT',blob,bytes,options.signal), get: (blob,options = {}) => operation('GET',blob,undefined,options.signal), checkConnection });
}
function fromEnvironment(env = process.env) {
  if (!env.HR_CV_STORAGE_PROVIDER || env.HR_CV_STORAGE_PROVIDER === 'disabled') throw fail('STORAGE_NOT_CONFIGURED');
  return createStore({ provider: env.HR_CV_STORAGE_PROVIDER, endpoint: env.HR_CV_STORAGE_ENDPOINT, bucket: env.HR_CV_STORAGE_BUCKET, region: env.HR_CV_STORAGE_REGION,
    accessKeyId: env.HR_CV_STORAGE_ACCESS_KEY_ID, secretAccessKey: env.HR_CV_STORAGE_SECRET_ACCESS_KEY,
    ...(env.HR_CV_STORAGE_SESSION_TOKEN ? { sessionToken: env.HR_CV_STORAGE_SESSION_TOKEN } : {}) });
}
// Technical primitives only. Audit uses its own keys, immutable version receipts,
// configuration and permissions; Recruitment's reference/business contract stays intact.
module.exports = { prepare, reference, createStore, fromEnvironment, publicAddress, MAX_BYTES, protocol: Object.freeze({ configValue, sign, nativeTransport }) };
