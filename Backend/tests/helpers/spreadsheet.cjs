// Independent ExcelJS reader for generated QA files only, not an HTTP import API.
const ExcelJS = require('exceljs'), tables = require('../../services/spreadsheet.service');
async function read(bytes) {
  const file = new ExcelJS.Workbook(); await file.xlsx.load(bytes);
  const book = tables.utils.book_new();
  for (const worksheet of file.worksheets) {
    const sheet = Object.create(null);
    worksheet.eachRow((row) => row.eachCell({includeEmpty: false}, cell => {
      const v = cell.value;
      sheet[cell.address] = {v: v && typeof v === 'object' && !(v instanceof Date) ? v.result ?? v.text ?? v.richText?.map(t => t.text).join('') : v};
      if (cell.formula) sheet[cell.address].f = cell.formula;
    }));
    if (worksheet.columnCount) sheet['!ref'] = `A1:${worksheet.getCell(worksheet.rowCount, worksheet.columnCount).address}`;
    tables.utils.book_append_sheet(book, sheet, worksheet.name);
  } return book;
}
function sheet_to_csv(sheet) {
  const rows = tables.utils.sheet_to_json(sheet); return rows.map(row => Object.values(row).join(',')).join('\n');
}
module.exports = {...tables, read, utils: {...tables.utils, sheet_to_csv}};
