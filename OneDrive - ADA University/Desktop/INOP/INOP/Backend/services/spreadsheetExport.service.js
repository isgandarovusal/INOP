const ExcelJS = require("exceljs");
const utils = {
  book_new: () => new ExcelJS.Workbook(),
  json_to_sheet: (rows) => rows,
  book_append_sheet: (book, rows, name) => {
    const sheet = book.addWorksheet(name);
    const keys = [...new Set(rows.flatMap((row) => Object.keys(row)))];
    sheet.columns = keys.map((key) => ({ header: key, key, width: 25 }));
    for (const row of rows)
      sheet.addRow(
        Object.fromEntries(
          Object.entries(row).map(([k, v]) => [
            k,
            typeof v === "object" && v !== null ? JSON.stringify(v) : v,
          ]),
        ),
      );
    sheet.getRow(1).font = { bold: true };
  },
};
module.exports = { utils, write: (book) => book.xlsx.writeBuffer() };
