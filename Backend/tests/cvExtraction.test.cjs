const test = require('node:test'), assert = require('node:assert/strict');
const { parseStructuredCv } = require('../services/cvStructuredParser.service');
for (const raw of ['+994 50 123 45 67', '+994 (50) 123-45-67', '0(50)1234567', '994501234567', '+994-50-123-45-67', '0501234567', '+994 60 123 45 67']) {
  test(`AZ phone preserves raw and normalizes ${raw}`, () => {
    const result = parseStructuredCv(`Ad: Əli Məmmədov\nTelefon: ${raw}`);
    assert.equal(result.phoneRaw, raw); assert.equal(result.phone, raw.includes('60') ? '+994601234567' : '+994501234567');
    assert.ok(result.extraction.fields.phone.evidence[0].includes(raw));
  });
}
for (const [raw, normalized] of [['+1 (415) 555-2671', '+14155552671'], ['0044 20 7946 0958', '+442079460958'], ['+49 30 12345678', '+493012345678']]) {
  test(`international phone ${raw}`, () => assert.equal(parseStructuredCv(`Phone: ${raw}`).phone, normalized));
}
for (const text of ['2018 - 2024', 'ID 123456789', '+994 00 123 45 67', '+99450123', '+123456789012345678']) {
  test(`invalid/nonphone text does not become a phone: ${text}`, () => assert.equal(parseStructuredCv(text).phone, ''));
}
for (const [language, source, name] of [
  ['az', 'CV\nAd soyad: Əli Məmmədov\nE-poçt: ali@example.invalid\nVəzifə: Kassir\nİş təcrübəsi\nKFC — Kassir 2018–2024\nBacarıqlar\nKassa, qida təhlükəsizliyi, növbə idarəetməsi, müştəri xidməti, HACCP\nTəhsil\nBakı universiteti 2014–2018\nDillər\nAzərbaycan dili, İngilis dili, Rus dili\nSertifikatlar\nHACCP — Training center 2024', 'Əli Məmmədov'],
  ['en', 'Curriculum Vitae\nName: Jane Smith\nEmail: jane@example.invalid\nPosition: Restaurant manager\nWork experience\nRestaurant manager 2020-2025\nSkills\nFood safety, shift management, customer service, cash handling, kitchen operations\nEducation\nUniversity 2014-2018\nLanguages\nEnglish, Russian\nCertificates\nFood safety certification 2024', 'Jane Smith'],
  ['ru', 'Резюме\nФИО: Иван Петров\nEmail: ivan@example.invalid\nДолжность: Менеджер ресторана\nОпыт работы\nМенеджер 2019-2025\nНавыки\nПищевая безопасность, обслуживание клиентов, управление сменой, касса\nОбразование\nУниверситет 2014-2018\nЯзыки\nРусский, английский\nСертификаты\nHACCP 2024', 'Иван Петров'],
]) {
  test(`${language} fixture extracts facts with evidence without inventing years`, () => {
    const r = parseStructuredCv(source);
    assert.equal(r.name, name); assert.match(r.email, /@example\.invalid$/);
    assert.ok(r.skills.includes('Food safety')); assert.ok(r.skills.includes('Customer service'));
    assert.ok(r.languages.includes('English')); assert.ok(r.languages.includes('Russian'));
    assert.ok(r.education); assert.ok(r.certificates.length); assert.ok(r.employmentHistory.length);
    assert.equal(r.experience, null); assert.ok(r.employmentHistory[0].start.year >= 2018);
    assert.equal(r.extraction.provider, 'rule-based'); assert.equal(r.extraction.reviewStatus, 'pending');
    assert.ok(r.extraction.version); assert.ok(r.extraction.fields.name.evidence.length);
  });
}
test('skill boundaries never infer Java from JavaScript or Go from MongoDB', () => {
  const r = parseStructuredCv('Name: Jane Smith\nSkills\nJavaScript, MongoDB, GitHub');
  assert.ok(r.skills.includes('JavaScript')); assert.ok(!r.skills.includes('Java')); assert.ok(!r.skills.includes('Go')); assert.ok(!r.skills.includes('Git'));
});
test('unknown data stays unknown; explicit zero experience remains zero', () => {
  const r = parseStructuredCv('Curriculum Vitae');
  assert.equal(r.name, ''); assert.equal(r.experience, null); assert.equal(r.extraction.fields.experience.confidence, null);
  assert.deepEqual(r.employmentHistory, []); assert.equal(parseStructuredCv('Experience: 0 years').experience, 0);
});
test('contact email takes priority over an employer email with ambiguity recorded', () => {
  const r = parseStructuredCv('Employer: team@example.invalid\nEmail: applicant@example.invalid');
  assert.equal(r.email, 'applicant@example.invalid'); assert.ok(r.extraction.warnings.includes('multiple_emails'));
});
test('age is never treated as work experience', () => {
  assert.equal(parseStructuredCv('Name: Jane Smith\nAge: 30 years old').experience, null);
  assert.equal(parseStructuredCv('Experience\nCashier 2018-2024\nAge: 30 years old').experience, null);
});
test('structured employment and certification dates retain unknown months and literal evidence', () => {
  const r = parseStructuredCv('Work experience\nKFC — Cashier 2018-2024\nCertificates\nHACCP — Training center 03.2024 expires 03.2026');
  assert.equal(r.employmentHistory[0].organization, 'KFC'); assert.equal(r.employmentHistory[0].title, 'Cashier');
  assert.equal(r.employmentHistory[0].start.month, null);
  assert.equal(r.certificationHistory[0].title, 'HACCP'); assert.equal(r.certificationHistory[0].organization, 'Training center');
  assert.deepEqual(r.certificationHistory[0].start, { year: 2024, month: 3 }); assert.deepEqual(r.certificationHistory[0].end, { year: 2026, month: 3 });
});
