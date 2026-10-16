// RFC 4180 CSV with spreadsheet formula-injection protection.
function cell(value) {
  if (value === null || value === undefined) return '';
  let s = value instanceof Date ? value.toISOString() : String(value);
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = `'${s}`;
  if (/[",\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(columns, rows) {
  const lines = [columns.map((c) => cell(c.label)).join(',')];
  for (const row of rows) {
    lines.push(columns.map((c) => cell(typeof c.value === 'function' ? c.value(row) : row[c.key])).join(','));
  }
  return '﻿' + lines.join('\r\n') + '\r\n';
}
