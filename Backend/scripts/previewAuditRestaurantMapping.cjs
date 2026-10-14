// Deliberately offline: no dotenv, Mongoose, credentials or database connection.
const fs = require('node:fs');
const { previewMapping } = require('../services/auditRestaurantMapping.service');
if (process.argv.length !== 4 || process.argv[2] !== '--input') {
  console.error('Usage: node Backend/scripts/previewAuditRestaurantMapping.cjs --input approved-local-snapshot.json');
  process.exitCode = 1;
} else {
  try {
    if (fs.statSync(process.argv[3]).size > 20 * 1024 * 1024) throw new Error('Snapshot exceeds 20 MB.');
    const input = fs.readFileSync(process.argv[3], 'utf8');
    if (Buffer.byteLength(input) > 20 * 1024 * 1024) throw new Error('Snapshot exceeds 20 MB.');
    console.log(JSON.stringify(previewMapping(JSON.parse(input)), null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
