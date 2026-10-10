const writeExcelFile = require("write-excel-file/node");

function toCell(value) {
  if (value == null) return null;
  if (value instanceof Date) {
    if (!Number.isFinite(value.getTime())) return null;
    return { value, type: Date, format: "yyyy-mm-dd hh:mm:ss" };
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return { value, type: Number };
  }
  if (typeof value === "boolean") return { value, type: Boolean };
  // Explicit string cells prevent user input from becoming spreadsheet formulas.
  return { value: String(value), type: String, format: "@" };
}

async function buildExcelBuffer(sheets) {
  const workbook = sheets.map(({ name, rows }) => {
    const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
    return {
      sheet: name,
      stickyRowsCount: headers.length ? 1 : 0,
      data: [
        headers.map((header) => ({ ...toCell(header), fontWeight: "bold" })),
        ...rows.map((row) => headers.map((header) => toCell(row[header]))),
      ],
    };
  });
  return writeExcelFile(workbook).toBuffer();
}

module.exports = { buildExcelBuffer };
