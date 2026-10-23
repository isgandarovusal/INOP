const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),{execFileSync}=require('node:child_process');
const cwd=path.resolve(__dirname,'..');
test('IPv6 zone rejection is bounded while office subnet grouping remains unchanged',()=>{
 const script=`const{Address6}=require('ip-address');if(Address6.isValid('fe80::1'+'%'.repeat(100000)+'\\n'))throw Error('Invalid address accepted');process.stdout.write('rejected');`;
 assert.equal(execFileSync(process.execPath,['-e',script],{cwd,encoding:'utf8',timeout:1500,stdio:['ignore','pipe','pipe']}),'rejected');
 const{ipKeyGenerator}=require('express-rate-limit');assert.equal(ipKeyGenerator('2001:db8:abcd:12::1',56),ipKeyGenerator('2001:db8:abcd:34::2',56));assert.notEqual(ipKeyGenerator('2001:db8:abcd:12::1',56),ipKeyGenerator('2001:db8:abcd:100::1',56));
});
test('Real DKIM signing handles heavily folded synthetic headers in a bounded stream transport without sending email',()=>{
 const script=`(async()=>{const crypto=require('node:crypto'),mail=require('nodemailer');const{privateKey}=crypto.generateKeyPairSync('rsa',{modulusLength:1024,privateKeyEncoding:{type:'pkcs8',format:'pem'},publicKeyEncoding:{type:'spki',format:'pem'}});const transport=mail.createTransport({streamTransport:true,buffer:true,dkim:{domainName:'example.invalid',keySelector:'qa',privateKey}});try{const raw=Buffer.from('From: hr@example.invalid\\r\\nTo: candidate@example.invalid,\\r\\n'+' candidate@example.invalid,\\r\\n'.repeat(40000)+'Subject: Synthetic bounded signing\\r\\n\\r\\nNo email was sent.');const info=await transport.sendMail({envelope:{from:'hr@example.invalid',to:['candidate@example.invalid']},raw});if(!Buffer.isBuffer(info.message)||!info.message.toString('ascii').includes('DKIM-Signature:'))throw Error('Signing did not execute');process.stdout.write('signed locally');}finally{transport.close();}})().catch(()=>{process.stderr.write('Synthetic signing failed');process.exitCode=1;});`;
 assert.equal(execFileSync(process.execPath,['-e',script],{cwd,encoding:'utf8',timeout:3000,stdio:['ignore','pipe','pipe']}),'signed locally');
});
