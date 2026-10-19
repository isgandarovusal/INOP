const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
if(process.env.INOP_AUDIT_TEST_PORT!=='27018'){process.stderr.write('Set INOP_AUDIT_TEST_PORT=27018 for the owned local replica-set QA environment. Production DB URIs are not used.\n');process.exitCode=1;}
else{const files=fs.readdirSync(path.join(root,'tests')).filter(n=>n.endsWith('.test.cjs')).sort().map(n=>path.join(root,'tests',n));if(!files.length)throw Error('No tests found.');const result=spawnSync(process.execPath,['--test','--test-concurrency=1','--test-timeout=300000',...files],{cwd:path.dirname(root),env:process.env,stdio:'inherit'});process.exitCode=result.status??1;}
