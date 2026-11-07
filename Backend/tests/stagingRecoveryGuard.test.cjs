const test=require('node:test'),assert=require('node:assert/strict'),{guard,validate}=require('../scripts/staging/ownedS3.cjs');
test('isolated acceptance refuses external bindings, production and enabled processing gates',()=>{
 const safe={INOP_AUDIT_TEST_PORT:'27018'};assert.doesNotThrow(()=>guard(safe));
 for(const change of[{NODE_ENV:'production'},{RENDER:'true'},{MONGO_URI:'mongodb://external'},{HR_CV_STORAGE_ENDPOINT:'https://external.example.com'},{INOP_AUDIT_TEST_PORT:'27017'},{HR_CV_SCAN_ENABLED:'true'},{HR_CV_PROCESSING_ENABLED:'true'}])assert.throws(()=>guard({...safe,...change}));
});
test('provider requires a pinned regular binary; no fallback provider',async()=>{await assert.rejects(validate(undefined),/VERIFIED_BINARY_REQUIRED/);await assert.rejects(validate('relative-path'),/VERIFIED_BINARY_REQUIRED/);await assert.rejects(validate('/bin/sh'));});
