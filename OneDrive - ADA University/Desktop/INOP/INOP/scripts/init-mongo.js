const admin=db.getSiblingDB('admin');
if(!admin.auth('root',process.env.MONGO_ROOT_PASSWORD))throw new Error('Mongo administrator authentication failed');
try { rs.status(); } catch(e) { if(e.code===94) rs.initiate({_id:'rs0',members:[{_id:0,host:'mongo:27017'}]}); else throw e; }
let ready=false;for(let i=0;i<60;i++){if(admin.hello().isWritablePrimary){ready=true;break;}sleep(1000);}if(!ready)throw new Error('Replica set did not become ready');
const app=db.getSiblingDB('inop');if(!app.getUser('inop'))app.createUser({user:'inop',pwd:process.env.MONGO_APP_PASSWORD,roles:[{role:'readWrite',db:'inop'}]});
