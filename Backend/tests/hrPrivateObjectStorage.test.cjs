const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { Readable } = require('node:stream');
const { EventEmitter } = require('node:events');
const storage = require('../services/hrPrivateObjectStorage.service');
const config = { provider: 's3', endpoint: 'https://objects.example.com', bucket: 'private-cvs', region: 'eu-test-1', accessKeyId: 'synthetic-test-key', secretAccessKey: 'synthetic-only-not-a-real-key' };
const bytes = Buffer.from('%PDF-SYNTHETIC private object adapter fixture'), mime = 'application/pdf';
const response = (status, value = []) => ({ status, body: Readable.from(value) });
const rejects = (operation, code) => assert.rejects(operation, error => error.code === code && error.message === 'Private storage operation is unavailable.' && !error.cause);
function store(transport, options = {}) { return storage.createStore(config, { transport, now: () => new Date('2026-10-11T08:00:00Z'), ...options }); }
test('Private object storage foundation is bounded, immutable, private and disabled until configured', async t => {
  await t.test('no binding is unavailable; no mock/config/legacy provider can enable a store', async () => {
    for (const env of [{}, { HR_CV_STORAGE_PROVIDER: 'disabled' }, { HR_CV_STORAGE_PROVIDER: 'mock' }]) assert.throws(() => storage.fromEnvironment(env), error => ['STORAGE_NOT_CONFIGURED','STORAGE_INVALID_CONFIG'].includes(error.code));
  });
  for (const endpoint of ['http://objects.example.com', 'https://127.0.0.1', 'https://[::1]', 'https://objects.local', 'https://user:password@objects.example.com', 'https://objects.example.com/prefix', 'https://objects.example.com/?token=x', 'https://objects.example.com/#x', 'https://objects.example.com:9443']) await t.test('unsafe endpoint rejected: ' + endpoint.replace(/user:password/, 'embedded-credential'), () => {
    assert.throws(() => storage.createStore({ ...config, endpoint }), { code: 'STORAGE_INVALID_CONFIG' });
  });
  await t.test('bucket, region and credential header injection fail before any request', () => {
    for (const change of [{bucket:'../foreign'}, {bucket:'bucket.with.dots'}, {region:'eu\nsecret'}, {accessKeyId:'key\r\nx'}, {secretAccessKey:'bad\nsecret'}, {sessionToken:'bad\r\ntoken'}]) assert.throws(() => storage.createStore({...config,...change}), {code:'STORAGE_INVALID_CONFIG'});
  });
  await t.test('input/reference validation bounds before any network; opaque UUIDs are unique', async () => {
    const references = new Set();
    for (let i=0;i<1000;i++) { const ref = storage.prepare(bytes,mime); assert.equal(Object.isFrozen(ref),true); references.add(ref.key); assert.equal(ref.sha256,crypto.createHash('sha256').update(bytes).digest('hex')); }
    assert.equal(references.size,1000);
    for (const input of [Buffer.alloc(0), Buffer.alloc(storage.MAX_BYTES+1), 'not-buffer']) assert.throws(() => storage.prepare(input,mime), {code:'STORAGE_INVALID_INPUT'});
    assert.throws(() => storage.prepare(bytes,'text/html'), {code:'STORAGE_INVALID_INPUT'});
    const ref=storage.prepare(bytes,mime); let requests=0; const adapter=store(() => {requests++;});
    for(const change of [{key:'../foreign'}, {key:'hr/cv/foreign%2fkey'}, {provider:'local'}, {url:'https://public.example.com/file'}, {size:0}, {sha256:'bad'}, {mimeType:'text/html'}]) await rejects(adapter.get({...ref,...change}),'STORAGE_INVALID_REFERENCE');
    await rejects(adapter.get(Object.create(ref)),'STORAGE_INVALID_REFERENCE');
    for (const body of [undefined,null,'not-buffer',Buffer.from('different')]) await rejects(adapter.put(ref,body),'STORAGE_IDENTITY_MISMATCH'); assert.equal(requests,0);
  });
  await t.test('private conditional encrypted write and bounded verified read share immutable metadata', async () => {
    const ref=storage.prepare(bytes,mime), requests=[];
    const adapter=store(async request => {requests.push(request); return response(200,request.method==='GET'?[bytes]:[]);});
    assert.deepEqual(await adapter.put(ref,bytes),ref); assert.deepEqual(await adapter.get(ref),bytes);
    const put=requests[0]; assert.equal(put.method,'PUT'); assert.equal(put.url,config.endpoint+'/'+config.bucket+'/'+ref.key);
    assert.equal(put.headers['if-none-match'],'*'); assert.equal(put.headers['x-amz-server-side-encryption'],'AES256'); assert.equal(put.headers['cache-control'],'private, no-store');
    assert.equal(put.headers['x-amz-meta-sha256'],ref.sha256); assert.equal(put.headers['content-type'],mime); assert.equal(put.headers['x-amz-date'],'20261011T080000Z');
    assert.equal(put.headers['x-amz-content-sha256'],ref.sha256); assert.match(put.headers.authorization,/^AWS4-HMAC-SHA256 Credential=synthetic-test-key\/20261011\/eu-test-1\/s3\/aws4_request,/);
    assert.ok(!JSON.stringify(ref).includes('synthetic-test-key')); assert.equal('delete' in adapter,false); assert.equal('url' in ref,false); // no public/presigned URL or automatic deletion
  });
  await t.test('a fixed canonical request matches an independently calculated HMAC signature', async () => {
    const ref={provider:'s3',key:'hr/cv/00000000-0000-4000-8000-000000000000',sha256:crypto.createHash('sha256').update(bytes).digest('hex'),size:bytes.length,mimeType:mime};let sent;
    await store(async request=>{sent=request;return response(200);}).put(ref,bytes);
    assert.equal(sent.headers.authorization.split('Signature=')[1],'9c94f7b95eead53df7b26d2a3b513d44d735702b39864fff3ef5f3ad953e3f99');
  });
  await t.test('caller mutation after put cannot alter request bytes or signed identity', async () => {
    const buffer=Buffer.from(bytes),ref=storage.prepare(buffer,mime);let saved,release;
    const adapter=store(request=>{saved=request;return new Promise(resolve=>{release=()=>resolve(response(200));});});
    const pending=adapter.put(ref,buffer);buffer.fill(0);assert.deepEqual(saved.body,bytes);release();assert.deepEqual(await pending,ref);
  });
  await t.test('temporary session credentials are signed but never returned in reference or errors', async () => {
    const token='SYNTHETIC_SESSION_TOKEN_NOT_A_CREDENTIAL';let signed;
    const adapter=storage.createStore({...config,sessionToken:token},{transport:async request=>{signed=request;return response(200);}});
    const ref=storage.prepare(bytes,mime);assert.deepEqual(await adapter.put(ref,bytes),ref);assert.equal(signed.headers['x-amz-security-token'],token);assert.ok(signed.headers.authorization.includes('x-amz-security-token'));
    assert.ok(!JSON.stringify(ref).includes(token));
  });
  for (const [status,code] of [[301,'STORAGE_UNAVAILABLE'],[302,'STORAGE_UNAVAILABLE'],[403,'STORAGE_UNAVAILABLE'],[404,'STORAGE_NOT_FOUND'],[409,'STORAGE_WRITE_CONFLICT'],[412,'STORAGE_WRITE_CONFLICT'],[429,'STORAGE_UNAVAILABLE'],[500,'STORAGE_UNAVAILABLE']]) await t.test('provider status '+status+' is sanitized; no redirect/retry/overwrite', async () => {
    let count=0;const adapter=store(async()=>{count++;return response(status,[Buffer.from('SYNTHETIC_PROVIDER_SECRET')]);});
    await rejects(adapter.put(storage.prepare(bytes,mime),bytes),code);assert.equal(count,1);
  });
  await t.test('exact hash/size are verified; short, changed and oversized responses fail closed', async () => {
    const ref=storage.prepare(bytes,mime);
    for (const altered of [bytes.subarray(0,2),Buffer.alloc(bytes.length,1)]) await rejects(store(async()=>response(200,[altered])).get(ref),'STORAGE_IDENTITY_MISMATCH');
    await rejects(store(async()=>response(200,[Buffer.alloc(bytes.length+1)])).get(ref),'STORAGE_RESPONSE_LIMIT');
    await rejects(store(async()=>response(200,[Buffer.alloc(4097)])).put(ref,bytes),'STORAGE_RESPONSE_LIMIT');
  });
  await t.test('errors including malicious STORAGE codes cannot leak raw provider/credential values', async () => {
    const ref=storage.prepare(bytes,mime);
    for (const error of [new Error('SYNTHETIC_PROVIDER_SECRET'),Object.assign(new Error('SYNTHETIC_PROVIDER_SECRET'),{code:'STORAGE_UNAVAILABLE',cause:{token:'SYNTHETIC_PROVIDER_SECRET'}})]) await rejects(store(async()=>{throw error;}).get(ref),'STORAGE_UNAVAILABLE');
  });
  await t.test('timeout is bounded even if transport ignores abort; PUT is uncertain and must reconcile', async () => {
    const ref=storage.prepare(bytes,mime), started=Date.now();const ignored=store(()=>new Promise(()=>{}),{timeoutMs:20});
    await rejects(ignored.get(ref),'STORAGE_TIMEOUT');await rejects(ignored.put(ref,bytes),'STORAGE_WRITE_UNCERTAIN');assert.ok(Date.now()-started<1000);
  });
  await t.test('request/response cancellation never returns bytes and releases bounded slots', async () => {
    const ref=storage.prepare(bytes,mime),abort=new AbortController();abort.abort();let calls=0;
    await rejects(store(async()=>{calls++;}).get(ref,{signal:abort.signal}),'STORAGE_ABORTED');assert.equal(calls,0);
    const current=new AbortController(),pending=store(()=>new Promise(()=>{})).get(ref,{signal:current.signal});current.abort();await rejects(pending,'STORAGE_ABORTED');
    const during=new AbortController();await rejects(store(async()=>response(200,(async function*(){yield bytes.subarray(0,2);during.abort();yield bytes.subarray(2);})())).get(ref,{signal:during.signal}),'STORAGE_ABORTED');
    assert.deepEqual(await store(async()=>response(200,[bytes])).get(ref),bytes);
  });
  await t.test('two shared process slots have no unbounded queue and recover after failure', async () => {
    const ref=storage.prepare(bytes,mime),a=new AbortController(),b=new AbortController(),adapter=store(()=>new Promise(()=>{}));
    const one=adapter.get(ref,{signal:a.signal}),two=store(()=>new Promise(()=>{})).get(ref,{signal:b.signal});
    await rejects(adapter.get(ref),'STORAGE_BUSY');a.abort();b.abort();await rejects(one,'STORAGE_ABORTED');await rejects(two,'STORAGE_ABORTED');assert.deepEqual(await store(async()=>response(200,[bytes])).get(ref),bytes);
  });
  await t.test('private/reserved/rebound/mapped DNS addresses are rejected; only validated address is pinned', async () => {
    for(const ip of ['127.0.0.1','10.1.2.3','169.254.169.254','172.16.0.2','192.168.0.1','100.64.1.1','0.0.0.0','224.1.2.3','::1','::','fc00::1','fe80::1','::ffff:127.0.0.1','0:0:0:0:0:ffff:7f00:1','2002:a00:1::1','64:ff9b::a00:1']) assert.equal(storage.publicAddress(ip),false,ip);
    assert.equal(storage.publicAddress('8.8.8.8'),true);assert.equal(storage.publicAddress('2606:4700:4700::1111'),true);
    const dns=require('node:dns/promises'),https=require('node:https'),lookup=dns.lookup,request=https.request;let calls=0,dnsCalls=0;
    try{
      const ref=storage.prepare(bytes,mime);
      https.request=()=>{calls++;throw Error('must not connect');};
      dns.lookup=async()=>[{address:'8.8.8.8',family:4},{address:'127.0.0.1',family:4}];
      await rejects(storage.createStore(config).get(ref),'STORAGE_NETWORK_DENIED');assert.equal(calls,0);
      dns.lookup=async()=>{dnsCalls++;return[{address:'8.8.8.8',family:4}];};
      https.request=(url,options,callback)=>{
        calls++;assert.equal(url.protocol,'https:');assert.notEqual(options.rejectUnauthorized,false);assert.equal(options.agent,false);
        options.lookup(url.hostname,{all:false},(error,address,family)=>{assert.equal(error,null);assert.equal(address,'8.8.8.8');assert.equal(family,4);});
        options.lookup(url.hostname,{all:true},(error,rows)=>{assert.equal(error,null);assert.deepEqual(rows,[{address:'8.8.8.8',family:4}]);});
        const emitter=new EventEmitter();emitter.end=()=>queueMicrotask(()=>callback(Object.assign(Readable.from([bytes]),{statusCode:200})));return emitter;
      };
      assert.deepEqual(await storage.createStore(config).get(ref),bytes);assert.equal(dnsCalls,1);assert.equal(calls,1);
    }finally{dns.lookup=lookup;https.request=request;}
  });
});
