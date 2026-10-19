// Narrow table-export contract. ExcelJS owns ZIP/XML serialization; no workbook
// import API is exposed by the application. All user strings remain literal cells.
const ExcelJS = require('exceljs');
const address = (r, c) => {
  let col = ''; for (let n = c + 1; n; n = Math.floor((n - 1) / 26)) col = String.fromCharCode(65 + (n - 1) % 26) + col;
  return col + (r + 1);
};
function point(value) {
  const m = /^([A-Z]+)([1-9][0-9]*)$/.exec(value); if (!m) throw Error('Invalid worksheet cell address.');
  return {r: Number(m[2]) - 1, c: [...m[1]].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1};
}
function decode_range(value) { const [a, b = a] = value.split(':'); return {s: point(a), e: point(b)}; }
function json_to_sheet(rows) {
  const headers = [...new Set(rows.flatMap(row => Object.keys(row)))], sheet = Object.create(null);
  const put = (r, c, v) => { if (v != null) sheet[address(r, c)] = {v, t: v instanceof Date ? 'd' : typeof v === 'number' ? 'n' : typeof v === 'boolean' ? 'b' : 's'}; };
  headers.forEach((v, c) => put(0, c, v)); rows.forEach((row, r) => headers.forEach((key, c) => put(r + 1, c, row[key])));
  if (headers.length) sheet['!ref'] = `A1:${address(rows.length, headers.length - 1)}`;
  return sheet;
}
function sheet_to_json(sheet) {
  if (!sheet['!ref']) return []; const range = decode_range(sheet['!ref']), rows = [];
  for (let r = 1; r <= range.e.r; r++) {
    const row = {}; for (let c = 0; c <= range.e.c; c++) { const key = sheet[address(0, c)]?.v, cell = sheet[address(r, c)]; if (key != null && cell?.v != null) Object.defineProperty(row, key, {value: cell.v, enumerable: true, writable: true, configurable: true}); }
    if (Object.keys(row).length) rows.push(row);
  } return rows;
}
const utils = {book_new: () => ({SheetNames: [], Sheets: Object.create(null)}), json_to_sheet, sheet_to_json, decode_range,
  book_append_sheet: (book, sheet, name) => { if (book.Sheets[name]) throw Error('Duplicate worksheet name.'); book.SheetNames.push(name); book.Sheets[name] = sheet; }};
async function write(book) {
  const output = new ExcelJS.Workbook();
  for (const name of book.SheetNames) {
    const source = book.Sheets[name], sheet = output.addWorksheet(name);
    for (const [key, cell] of Object.entries(source)) {
      if (key.startsWith('!')) continue; const target = sheet.getCell(key);
      // Never copy formula, hyperlink, shared-formula or arbitrary cell objects.
      target.value = cell.v instanceof Date ? cell.v : ['number', 'boolean'].includes(typeof cell.v) ? cell.v : cell.v == null ? null : String(cell.v);
      target.alignment = {vertical: 'top', wrapText: true}; if (cell.v instanceof Date) target.numFmt = 'yyyy-mm-dd hh:mm:ss';
    }
    (source['!cols'] || []).forEach((col, i) => { sheet.getColumn(i + 1).width = col.wch; });
    if (source['!rows']?.[0]?.hpt) sheet.getRow(1).height = source['!rows'][0].hpt;
    sheet.getRow(1).font = {bold: true, color: {argb: 'FF17365D'}};
    if (source['!autofilter']) sheet.autoFilter = source['!autofilter'].ref;
    sheet.views = [{state: 'frozen', ySplit: 1}];
  }
  return Buffer.from(await output.xlsx.writeBuffer());
}
module.exports = {utils, write};
