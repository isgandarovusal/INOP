const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createRequire } = require('node:module');
const ExcelJS = require('exceljs');
const excelRequire = createRequire(require.resolve('exceljs'));
const archiver = excelRequire('archiver');
const unzipper = excelRequire('unzipper');
const archiveRequire = createRequire(excelRequire.resolve('archiver'));
const legacyGlobs = [
  createRequire(archiveRequire.resolve('archiver-utils'))('glob'),
  createRequire(createRequire(archiveRequire.resolve('zip-stream')).resolve('archiver-utils'))('glob'),
  createRequire(createRequire(createRequire(excelRequire.resolve('unzipper')).resolve('fstream')).resolve('rimraf'))('glob'),
];
async function owned(callback) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'inop-dependency-'));
  try {
    await fs.mkdir(path.join(dir, 'sub'));
    for (const file of ['a.txt', 'b.md', '.hidden.txt', 'sub/c.txt', 'sub/d.md']) await fs.writeFile(path.join(dir, file), 'synthetic');
    await callback(dir);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
}

test('ExcelJS legacy glob callback and sync APIs preserve discovery, exclusion, globstar, braces and nonull', () => owned(async dir => {
  for (const glob of legacyGlobs) {
    for (const [pattern, options, expected] of [
      ['**/*.{txt,md}', {}, ['a.txt','b.md','sub/c.txt','sub/d.md']],
      ['**/*.txt', { ignore: 'sub/**' }, ['a.txt']],
      ['**/*.txt', { dot: true }, ['.hidden.txt','a.txt','sub/c.txt']],
      ['**/!(*.md)', { nodir: true }, ['a.txt','sub/c.txt']],
      ['none-{a,b}.txt', { nonull: true }, ['none-a.txt','none-b.txt']],
    ]) {
      const opts = { cwd: dir, ...options };
      assert.deepEqual(glob.sync(pattern, opts).sort(), expected.slice().sort());
      const result = await new Promise((resolve, reject) => glob(pattern, opts, (error, files) => error ? reject(error) : resolve(files)));
      assert.deepEqual(result.sort(), expected.slice().sort());
    }
  }
}));

test('Archiver glob filtering and Unzipper readback preserve only selected synthetic bytes', () => owned(async dir => {
  const archive = archiver('zip', { zlib: { level: 1 } });
  const chunks = [];
  const complete = new Promise((resolve, reject) => {
    archive.on('data', chunk => chunks.push(chunk));
    archive.once('end', resolve); archive.once('error', reject);
    archive.on('warning', reject);
  });
  archive.glob('**/*.txt', { cwd: dir, ignore: ['sub/**'] });
  await archive.finalize(); await complete;
  const zip = await unzipper.Open.buffer(Buffer.concat(chunks));
  assert.deepEqual(zip.files.map(f => f.path), ['a.txt']);
  assert.equal((await zip.files[0].buffer()).toString(), 'synthetic');
}));

test('ExcelJS buffered and streaming XLSX roundtrip retains types, formulas, Unicode and styles', () => owned(async dir => {
  const file = path.join(dir, 'synthetic.xlsx');
  for (const streaming of [false, true]) {
    const book = streaming ? new ExcelJS.stream.xlsx.WorkbookWriter({ filename: file, useStyles: true, useSharedStrings: true }) : new ExcelJS.Workbook();
    const sheet = book.addWorksheet('AZ EN RU');
    sheet.addRow(['Ad', 'Count', 'Formula', 'Date']);
    const row = sheet.addRow(['Əli Fictional / Вымышленный', 7, { formula: 'B2*2', result: 14 }, new Date('2026-01-02T00:00:00Z')]);
    row.getCell(2).numFmt = '0.00'; row.getCell(1).font = { bold: true };
    if (streaming) { sheet.commit(); await book.commit(); }
    const bytes = streaming ? await fs.readFile(file) : await book.xlsx.writeBuffer();
    const read = new ExcelJS.Workbook(); await read.xlsx.load(bytes);
    const loaded = read.getWorksheet('AZ EN RU');
    assert.equal(loaded.getCell('A2').value, 'Əli Fictional / Вымышленный');
    assert.equal(loaded.getCell('B2').value, 7); assert.equal(loaded.getCell('B2').numFmt, '0.00');
    assert.equal(loaded.getCell('A2').font.bold, true);
    assert.deepEqual(loaded.getCell('C2').value, { formula: 'B2*2', result: 14 });
    assert.equal(loaded.getCell('D2').value.toISOString(), '2026-01-02T00:00:00.000Z');
    await fs.writeFile(file, bytes);
    const rows = [];
    for await (const worksheet of new ExcelJS.stream.xlsx.WorkbookReader(file, { entries:'emit', sharedStrings:'cache', styles:'cache', hyperlinks:'ignore', worksheets:'emit' })) {
      for await (const r of worksheet) rows.push(r.values);
    }
    assert.equal(rows[1][1], 'Əli Fictional / Вымышленный'); assert.equal(rows[1][2], 7);
  }
}));

test('Swagger JSDoc discovery and existing static API documentation remain valid', () => owned(async dir => {
  await fs.writeFile(path.join(dir, 'route.js'), '/**\n * @openapi\n * /synthetic:\n *   get:\n *     responses:\n *       200:\n *         description: Synthetic success\n */');
  const jsdoc = require('swagger-jsdoc');
  const spec = jsdoc({ definition: { openapi:'3.0.0', info:{ title:'Synthetic', version:'1' } }, apis:[path.join(dir, '**/*.{js,ts}')], failOnErrors:true });
  assert.equal(spec.paths['/synthetic'].get.responses['200'].description, 'Synthetic success');
  const setup = require('../swagger');
  assert.equal(setup.swaggerSpec.openapi, '3.0.0'); assert.ok(Object.keys(setup.swaggerSpec.paths).length > 0);
  const routes = new Map(); setup({ get:(p, h) => routes.set(p,h), use:() => {} });
  for (const endpoint of ['/api-docs/swagger.json','/api-docs/openapi.json']) {
    let result; routes.get(endpoint)({}, { json:value => { result=value; } }); assert.equal(result, setup.swaggerSpec);
  }
}));

test('Vendored adapter tarball contains exactly its reviewed source and manifest', async () => {
  const root = path.resolve(__dirname, '../vendor');
  const bytes = require('node:zlib').gunzipSync(await fs.readFile(path.join(root, 'inop-minimatch-glob7-compat-1.0.0.tgz')));
  const entries = new Map();
  for (let offset = 0; offset + 512 <= bytes.length;) {
    const header = bytes.subarray(offset, offset + 512);
    const name = header.subarray(0,100).toString().replace(/\0.*$/s,'');
    if (!name) break;
    const size = parseInt(header.subarray(124,136).toString().replace(/\0.*$/s,'').trim(), 8);
    assert.ok(Number.isSafeInteger(size) && size >= 0);
    assert.ok([0,48].includes(header[156]), 'Only regular source files may be packaged');
    assert.ok(!entries.has(name), 'No duplicate archive entries');
    entries.set(name, bytes.subarray(offset + 512, offset + 512 + size));
    offset += 512 + Math.ceil(size / 512) * 512;
  }
  assert.deepEqual([...entries.keys()].sort(), ['package/index.cjs','package/package.json']);
  for (const name of ['index.cjs','package.json']) assert.deepEqual(entries.get('package/' + name), await fs.readFile(path.join(root, 'minimatch-glob7-compat', name)));
});

test('ExcelJS Unzipper/Fstream legacy rimraf callback removes only the owned matched paths', () => owned(async dir => {
  const rimraf = createRequire(createRequire(excelRequire.resolve('unzipper')).resolve('fstream'))('rimraf');
  await new Promise((resolve, reject) => rimraf(path.join(dir, 'sub', '*.md'), error => error ? reject(error) : resolve()));
  assert.deepEqual((await fs.readdir(path.join(dir, 'sub'))).sort(), ['c.txt']);
  assert.equal(await fs.readFile(path.join(dir, 'b.md'), 'utf8'), 'synthetic');
}));
