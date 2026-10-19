const{test}=require('node:test'),assert=require('node:assert/strict');
test('Database fixtures require explicit owned port and never default to another MongoDB',async()=>{
 const before=process.env.INOP_AUDIT_TEST_PORT,{port}=require('./helpers/localTestDatabase.cjs');
 try{for(const input of [undefined,'27017','production','27018/production','']){if(input===undefined)delete process.env.INOP_AUDIT_TEST_PORT;else process.env.INOP_AUDIT_TEST_PORT=input;assert.throws(port,/no database connection/);}
 process.env.INOP_AUDIT_TEST_PORT='27018';assert.equal(port(),'27018');
 }finally{if(before===undefined)delete process.env.INOP_AUDIT_TEST_PORT;else process.env.INOP_AUDIT_TEST_PORT=before;}
});
