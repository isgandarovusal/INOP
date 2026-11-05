const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

test('Typography Package 1: Self-hosted Inter font assets exist and have valid WOFF2 headers', () => {
  const fontDir = path.join(root, 'public', 'fonts');
  const requiredFiles = [
    'InterVariable.woff2',
    'Inter-Regular.woff2',
    'Inter-Medium.woff2',
    'Inter-SemiBold.woff2',
    'Inter-Bold.woff2',
  ];

  for (const filename of requiredFiles) {
    const filePath = path.join(fontDir, filename);
    assert.ok(fs.existsSync(filePath), `Font file missing: ${filename}`);

    const stats = fs.statSync(filePath);
    assert.ok(stats.size > 50000, `Font file unexpectedly small (${stats.size} bytes): ${filename}`);

    // Verify WOFF2 magic bytes: 'wOF2' -> 0x77, 0x4F, 0x46, 0x32
    const buffer = Buffer.alloc(4);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 4, 0);
    fs.closeSync(fd);
    assert.equal(buffer.toString('ascii'), 'wOF2', `Invalid WOFF2 signature in ${filename}`);
  }
});

test('Typography Package 1: CSS font-face declarations include font-display: swap and fallback rules', () => {
  const fontsCssPath = path.join(root, 'src', 'Styles', 'fonts.css');
  assert.ok(fs.existsSync(fontsCssPath), 'fonts.css must exist');

  const content = fs.readFileSync(fontsCssPath, 'utf8');
  assert.match(content, /@font-face\s*\{/, 'fonts.css must contain @font-face rules');
  assert.match(content, /font-family:\s*['"]Inter['"]/, 'fonts.css must declare font-family: Inter');
  assert.match(content, /font-display:\s*swap/, 'fonts.css must specify font-display: swap');
  assert.match(content, /\/fonts\/InterVariable\.woff2/, 'fonts.css must reference InterVariable.woff2');
  assert.match(content, /\/fonts\/Inter-Regular\.woff2/, 'fonts.css must reference Inter-Regular.woff2');
});

test('Typography Package 1: variables.css and hr-workspace.css use unified --font-sans token', () => {
  const variablesCss = fs.readFileSync(path.join(root, 'src', 'Styles', 'variables.css'), 'utf8');
  assert.match(variablesCss, /@import\s+['"]\.\/fonts\.css['"]/, 'variables.css must import fonts.css');
  assert.match(variablesCss, /--font-sans:\s*["']Inter["']/, 'variables.css must specify Inter as primary font');
  assert.match(variablesCss, /body\s*\{[^}]*font-family:\s*var\(--font-sans\)/s, 'body must use var(--font-sans)');

  const hrWorkspaceCss = fs.readFileSync(path.join(root, 'src', 'Styles', 'hr-workspace.css'), 'utf8');
  assert.match(hrWorkspaceCss, /font-family:\s*var\(--font-sans\)/, 'hr-workspace.css must use var(--font-sans)');
});

test('Typography Package 1: index.html preloads the primary variable font for zero layout shift', () => {
  const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(
    indexHtml,
    /<link\s+rel=["']preload["']\s+href=["']\/fonts\/InterVariable\.woff2["']\s+as=["']font["']\s+type=["']font\/woff2["']\s+crossorigin\s*\/?>/,
    'index.html must preload InterVariable.woff2',
  );
});

test('Typography Package 1: Azerbaijani Latin Extended character set coverage in translations', () => {
  const azLocalePath = path.join(root, 'src', 'i18n', 'locales', 'az.json');
  assert.ok(fs.existsSync(azLocalePath), 'az.json must exist');

  const azContent = fs.readFileSync(azLocalePath, 'utf8');
  const requiredAzChars = ['ə', 'Ə', 'ı', 'İ', 'ğ', 'Ğ', 'ö', 'Ö', 'ş', 'Ş', 'ç', 'Ç', 'ü', 'Ü'];

  for (const char of requiredAzChars) {
    assert.ok(azContent.includes(char), `Azerbaijani character '${char}' should be present in az.json translations`);
  }
});

test('Typography Package 1: Cyrillic character set coverage in Russian translations', () => {
  const ruLocalePath = path.join(root, 'src', 'i18n', 'locales', 'ru.json');
  assert.ok(fs.existsSync(ruLocalePath), 'ru.json must exist');

  const ruContent = fs.readFileSync(ruLocalePath, 'utf8');
  const sampleCyrillic = ['а', 'б', 'в', 'г', 'д', 'е', 'ж', 'и', 'й', 'к', 'л', 'м', 'н', 'о', 'п', 'р', 'с', 'т', 'у', 'ф', 'х', 'ц', 'ч', 'ш', 'щ', 'ъ', 'ы', 'ь', 'э', 'ю', 'я'];

  for (const char of sampleCyrillic) {
    assert.ok(ruContent.includes(char), `Cyrillic character '${char}' should be present in ru.json translations`);
  }
});
