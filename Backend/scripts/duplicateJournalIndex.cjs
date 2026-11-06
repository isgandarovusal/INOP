// Dry run by default. Database URL comes only from the established environment.
// Never prints connection strings, journal notes, candidate IDs or command IDs.
const fs = require('node:fs'), mongoose = require('mongoose');
async function main() {
  const args = process.argv.slice(2), mode = args[0] || 'inspect';
  if (!['inspect','apply','rollback'].includes(mode) || (mode !== 'inspect' && args[1] !== '--writers-paused') || args.length > (mode==='inspect'?1:3)) throw Error('Usage: inspect | apply --writers-paused receipt.json | rollback --writers-paused receipt.json');
  if (mode !== 'inspect' && !args[2]) throw Error('A receipt path is required.');
  // Refuse overwrite before any DB operation. Receipt fd is operator-owned.
  const fd = mode === 'apply' ? fs.openSync(args[2], 'wx', 0o600) : undefined;
  try {
    if (!process.env.MONGO_URI) throw Error('MONGO_URI must be configured by the operator.');
    await mongoose.connect(process.env.MONGO_URI, { autoIndex: false, autoCreate: false, serverSelectionTimeoutMS: 5000 });
    const collection = mongoose.connection.db.collection(require('../models/candidateDuplicateReview.model').collection.name), service = require('../services/duplicateJournalIndex.service');
    if (mode === 'inspect') console.log(JSON.stringify(await service.inspect(collection)));
    else if (mode === 'apply') { const receipt = await service.apply(collection,{writersPaused:true}); fs.writeFileSync(fd,JSON.stringify(receipt,null,2)+'\n');fs.fsyncSync(fd);console.log('Index verified; receipt saved.'); }
    else { const receipt = JSON.parse(fs.readFileSync(args[2],'utf8')); console.log(JSON.stringify(await service.rollback(collection,receipt,{writersPaused:true}))); }
  } finally { if (fd !== undefined) fs.closeSync(fd);await mongoose.disconnect(); }
}
main().catch(()=>{console.error('Duplicate-journal index procedure failed. No journal records were deleted. Review data/index conflicts and operator prerequisites.');process.exitCode=1;});
