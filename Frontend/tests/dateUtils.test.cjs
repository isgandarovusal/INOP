/**
 * Package 2 — Azerbaijani Date Localization Tests
 *
 * Tests the dateUtils.ts formatting functions by transpiling the TypeScript
 * source on-the-fly with the existing TypeScript compiler dev dependency.
 *
 * Run: node --test tests/dateUtils.test.cjs
 */

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const fs = require('node:fs');

// Transpile trusted repository source with TypeScript, already a direct dev
// dependency. Vite 8 uses Rolldown and no longer provides an esbuild binary.
const srcPath = path.resolve(__dirname, '../src/Utils/dateUtils.ts');
const compiled = ts.transpileModule(fs.readFileSync(srcPath, 'utf8'), {
  fileName: srcPath,
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;
const dateModule = new Module(srcPath, module);
dateModule.filename = srcPath;
dateModule.paths = Module._nodeModulePaths(path.dirname(srcPath));
dateModule._compile(compiled, srcPath);
const dateUtils = dateModule.exports;

const { formatDateOnly, formatDateTime, formatAppDate, BAKU_TIMEZONE } = dateUtils;

// ---------------------------------------------------------------------------
// BAKU_TIMEZONE constant
// ---------------------------------------------------------------------------
test('BAKU_TIMEZONE is Asia/Baku', () => {
  assert.equal(BAKU_TIMEZONE, 'Asia/Baku');
});

// ---------------------------------------------------------------------------
// formatDateOnly — calendar date strings, no timezone conversion
// ---------------------------------------------------------------------------
test('formatDateOnly: YYYY-MM-DD → DD/MM/YYYY for az locale', () => {
  assert.equal(formatDateOnly('2026-11-05', 'az'), '05/11/2026');
});

test('formatDateOnly: YYYY-MM-DD → DD/MM/YYYY for en locale', () => {
  assert.equal(formatDateOnly('2026-11-05', 'en'), '05/11/2026');
});

test('formatDateOnly: YYYY-MM-DD → DD.MM.YYYY for ru locale', () => {
  assert.equal(formatDateOnly('2026-11-05', 'ru'), '05.11.2026');
});

test('formatDateOnly: leading zeros preserved (month 01)', () => {
  assert.equal(formatDateOnly('2026-01-07', 'az'), '07/01/2026');
});

test('formatDateOnly: null returns empty string', () => {
  assert.equal(formatDateOnly(null, 'az'), '');
});

test('formatDateOnly: undefined returns empty string', () => {
  assert.equal(formatDateOnly(undefined, 'az'), '');
});

test('formatDateOnly: empty string returns empty string', () => {
  assert.equal(formatDateOnly('', 'az'), '');
});

// ---------------------------------------------------------------------------
// formatAppDate — smart dispatcher; date-only strings MUST NOT shift day
// ---------------------------------------------------------------------------
test('formatAppDate: date-only string never shifts day (critical TZ regression)', () => {
  // '2026-11-05' must render as 05/11/2026 regardless of local TZ offset
  assert.equal(formatAppDate('2026-11-05', 'az'), '05/11/2026');
});

test('formatAppDate: date-only at year boundary never shifts day', () => {
  // A date-only string of '2026-01-01' must stay 01/01/2026 — never 31/12/2025
  assert.equal(formatAppDate('2026-01-01', 'az'), '01/01/2026');
});

test('formatAppDate: UTC ISO-8601 timestamp converts to Baku local date', () => {
  // 2026-01-01T22:30:00Z is 2026-01-02T02:30:00+04:00 in Baku → 02/01/2026
  assert.equal(formatAppDate('2026-01-01T22:30:00Z', 'az'), '02/01/2026');
});

test('formatAppDate: UTC ISO-8601 timestamp midnight stays same day in Baku', () => {
  // 2026-11-05T00:00:00Z → 2026-11-05T04:00:00+04:00 → 05/11/2026 (same day)
  assert.equal(formatAppDate('2026-11-05T00:00:00Z', 'az'), '05/11/2026');
});

test('formatAppDate: null returns empty string', () => {
  assert.equal(formatAppDate(null, 'az'), '');
});

// ---------------------------------------------------------------------------
// formatDateTime — timestamps with time display
// ---------------------------------------------------------------------------
test('formatDateTime: UTC timestamp shows correct Baku local time', () => {
  // 2026-11-05T08:00:00Z → 12:00 in Baku (+4)
  const result = formatDateTime('2026-11-05T08:00:00Z', 'az', { includeTime: true });
  // Should contain 12:00
  assert.match(result, /12[:\s]00/);
});

test('formatDateTime: ru locale uses dots as separator', () => {
  const result = formatDateTime('2026-11-05T08:00:00Z', 'ru', { includeTime: true });
  // Should use dots: DD.MM.YYYY
  assert.match(result, /\d{2}\.\d{2}\.\d{4}/);
});

test('formatDateTime: az locale uses slashes as separator', () => {
  const result = formatDateTime('2026-11-05T08:00:00Z', 'az', { includeTime: true });
  // Should use slashes: DD/MM/YYYY
  assert.match(result, /\d{2}\/\d{2}\/\d{4}/);
});

test('formatDateTime: null returns empty string', () => {
  assert.equal(formatDateTime(null, 'az', { includeTime: true }), '');
});

test('formatDateTime: invalid date string returns input string', () => {
  assert.equal(formatDateTime('not-a-date', 'az', { includeTime: true }), 'not-a-date');
});

// ---------------------------------------------------------------------------
// Locale default
// ---------------------------------------------------------------------------
test('formatAppDate: defaults to az locale when locale arg omitted', () => {
  assert.equal(formatAppDate('2026-11-05'), '05/11/2026');
});
