// No URI/environment/connection/DDL operation: safe source-contract inventory.
if(process.argv.length!==2){process.stderr.write('Usage: node Backend/scripts/hrReleaseIndexInventory.cjs (inventory only)\n');process.exitCode=2;}
else process.stdout.write(JSON.stringify(require('../services/hrReleaseIndexes.service').catalog(),null,2)+'\n');
