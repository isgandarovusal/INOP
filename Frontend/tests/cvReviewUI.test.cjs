const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs/promises'), path = require('node:path');
const { withBrowserFixture } = require('./helpers/browser.cjs');
const { docx } = require('../../Backend/tests/helpers/cvDocuments.cjs');
const Candidate = require('../../Backend/models/candidate.model');
const { uploadsDir } = require('../../Backend/middleware/privateUpload.middleware');
const harness = `
import React from 'react';import {createRoot} from 'react-dom/client';import {BrowserRouter,Routes,Route,useNavigate} from 'react-router-dom';import {AuthContext} from '/src/Context/AuthContext.ts';
import '/src/i18n/index.ts';import Form from '/src/Pages/Recruitment/Candidates/CandidateForm.tsx';import Detail from '/src/Pages/Recruitment/Candidates/CandidateDetail.tsx';import api from '/src/api/axios.ts';api.defaults.baseURL='/api';
function App(){const [user,setUser]=React.useState(window.testUser);window.setTestUser=setUser;window.navigateTest=useNavigate();return React.createElement(AuthContext.Provider,{value:{user,isLoading:false}},React.createElement(Routes,null,
React.createElement(Route,{path:'/app/recruitment/candidates/:id/edit',element:React.createElement(Form)}),React.createElement(Route,{path:'/app/recruitment/candidates/:id',element:React.createElement(Detail)}),React.createElement(Route,{path:'/app/recruitment/candidates',element:React.createElement('div',null,'Saved review')})));}
createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode,null,React.createElement(BrowserRouter,null,React.createElement(App))));
`;
test('HR review UI preserves unknowns, edits extracted facts and previews private DOCX safely', async t => withBrowserFixture(harness, async h => {
  const bytes = docx('Name: Original Person\nPhone: +994 (50) 123-45-67\nWork experience\nKFC — Cashier 2018-2024\nEducation\nUniversity 2014-2018\nSkills\nFood safety\nLanguages\nEnglish\nCertificates\nHACCP — Training center 2024\n<script>window.pwned=1</script>');
  const form = new FormData(); form.append('cv', new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }), 'original.docx'); form.append('name', 'Original Person'); form.append('role', 'Cashier');
  const response = await fetch(h.apiBase + '/candidates', { method: 'POST', headers: { Authorization: 'Bearer ' + h.tokens.admin }, body: form });
  assert.equal(response.status, 201); const candidate = await response.json();
  try {
    await t.test('unknown experience stays empty, source evidence is visible and unknown months stay unknown', async () => {
      await h.open('admin', `/app/recruitment/candidates/${candidate._id}/edit`); await h.page.locator('input[name=name]').waitFor();
      assert.equal(await h.page.locator('input[name=experience]').inputValue(), '');
      assert.equal(await h.page.locator('input[name=phone]').inputValue(), '+994 (50) 123-45-67');
      assert.equal(await h.page.locator('select[aria-label$="start month"]').first().inputValue(), '');
      assert.equal(await h.page.locator('[data-cv-review=extracted]').count(), 1);
    });
    await t.test('HR edits name/phone/zero/education/languages/certificates and confirms review', async () => {
      await h.page.locator('input[name=name]').fill('HR reviewed name'); await h.page.locator('input[name=phone]').fill('0(50)1234567');
      await h.page.locator('input[name=experience]').fill('0'); await h.page.locator('textarea[name=education]').fill('HR reviewed university');
      const languages = h.page.getByRole('textbox', { name: 'Dillər', exact: true }); await languages.fill('Azerbaijani'); await languages.press('Enter');
      const certs = h.page.getByRole('textbox', { name: 'Sertifikatlar', exact: true }); await certs.fill('Food safety course'); await certs.press('Enter');
      await h.page.locator('input[name=confirmReview]').check(); await h.page.locator('button[type=submit]').click(); await h.page.waitForURL('**/app/recruitment/candidates');
      const c = await Candidate.findById(candidate._id);
      assert.equal(c.name, 'HR reviewed name'); assert.equal(c.phone, '+994501234567'); assert.equal(c.phoneRaw, '0(50)1234567'); assert.equal(c.experience, 0);
      assert.equal(c.education, 'HR reviewed university'); assert.ok(c.languages.includes('Azerbaijani')); assert.ok(c.certificates.includes('Food safety course'));
      assert.equal(c.cvReview.reviewStatus, 'confirmed'); assert.equal(c.employmentHistory[0].start.month, null);
    });
    await t.test('authorized DOCX preview is escaped text; download still contains original DOCX', async () => {
      await h.open('admin', `/app/recruitment/candidates/${candidate._id}`); await h.page.getByText('HR reviewed name', { exact: true }).waitFor();
      await h.page.getByRole('button', { name: 'CV-ni aç', exact: true }).click(); await h.page.getByRole('dialog').waitFor();
      assert.match(await h.page.locator('dialog pre, [role=dialog] pre').textContent(), /<script>window.pwned=1<\/script>/);
      assert.equal(await h.page.evaluate(() => window.pwned), undefined);
      const result = await h.page.evaluate(async () => { const link = document.querySelector('[role=dialog] a'); const blob = await fetch(link.href).then(r => r.blob()); return { name: link.download, size: blob.size, type: blob.type }; });
      assert.equal(result.name, 'original.docx'); assert.equal(result.size, bytes.length); assert.equal(result.type, 'application/octet-stream');
      assert.ok(h.wire.some(r => r.path.endsWith('/cv') && r.actor === 'admin'));
      await h.page.getByRole('button', { name: 'Bağla', exact: true }).click(); assert.equal(await h.page.getByRole('dialog').count(), 0);
    });
    await t.test('secondary DOCX extraction failure preserves authorized original download', async () => {
      await h.page.route('**/api/candidates/parse-cv', r => r.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"Synthetic extraction outage"}' }));
      await h.page.getByRole('button', { name: 'CV-ni aç', exact: true }).click(); await h.page.getByRole('dialog').waitFor();
      assert.match(await h.page.locator('[role=dialog] pre').textContent(), /Orijinal CV-ni/);
      assert.equal(await h.page.locator('[role=dialog] a').getAttribute('download'), 'original.docx');
      await h.page.getByRole('button', { name: 'Bağla', exact: true }).click();
      await h.page.unroute('**/api/candidates/parse-cv');
    });
    await t.test('authorization failure never exposes a retained DOCX blob', async () => {
      await h.page.route('**/api/candidates/parse-cv', r => r.fulfill({ status: 403, contentType: 'application/json', body: '{"message":"Synthetic revoked permission"}' }));
      await h.page.getByRole('button', { name: 'CV-ni aç', exact: true }).click(); await h.page.locator('[data-file-error=forbidden]').waitFor();
      assert.equal(await h.page.getByRole('dialog').count(), 0);
      await h.page.unroute('**/api/candidates/parse-cv');
    });
    await t.test('partial extraction warning remains visible and translated in AZ/EN/RU without refetch', async () => {
      await Candidate.updateOne({ _id: candidate._id }, { $set: { 'cvReview.warnings': ['text_limit', 'page_limit'] } });
      await h.open('admin', `/app/recruitment/candidates/${candidate._id}`);
      await h.page.locator('[data-cv-review=extracted]').waitFor();
      await h.page.getByRole('alert').filter({ hasText: '50' }).waitFor();
      const requests = h.wire.length;
      for (const language of ['az', 'en', 'ru']) {
        const expected = await h.page.evaluate(async language => {
          const { default: i18n } = await import('/src/i18n/index.ts'); await i18n.changeLanguage(language);
          return ['text_limit', 'page_limit'].map(code => i18n.t('cvReview.' + code));
        }, language);
        for (const message of expected) {
          assert.ok(message.length > 30 && !message.startsWith('cvReview.'));
          await h.page.getByRole('alert').filter({ hasText: message }).waitFor();
        }
      }
      assert.equal(h.wire.length, requests);
    });
    assert.deepEqual(h.pageErrors, []);
  } finally { await fs.unlink(path.join(uploadsDir, path.basename(candidate.cvUrl))); }
}));
