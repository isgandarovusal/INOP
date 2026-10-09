const test = require('node:test');
const assert = require('node:assert/strict');
const { withBrowserFixture } = require('./helpers/browser.cjs');
const harness = `
import React from 'react';import{createRoot}from'react-dom/client';
import{BrowserRouter,useNavigate}from'react-router-dom';
import*as service from'/src/Services/auditTemplatesService.ts';
import api from'/src/api/axios.ts';api.defaults.baseURL='/api';window.templateService=service;
function App(){window.navigateTest=useNavigate();return React.createElement('div',null,'Template contract fixture');}
createRoot(document.getElementById('root')).render(React.createElement(BrowserRouter,null,React.createElement(App)));
`;
test('Template service uses authenticated JSON and preserves response/error contracts', async t => withBrowserFixture(harness, async h => {
  await h.models.Role.updateOne({ key: 'test_own' }, { $push: { permissions: { resource: 'audit.template', action: '*', scope: 'own' } } });
  const payload = { name: 'Browser template', brandName: 'Synthetic brand', auditType: 'standard', sections: [] };
  let id;
  await t.test('all: actual service create/list/detail/update/copy/delete flow', async () => {
    await h.open('admin', '/template-test');
    const data = await h.page.evaluate(async input => {
      const service = window.templateService;
      const created = await service.createAuditTemplate(input);
      const listed = await service.getAuditTemplates({ auditType: input.auditType });
      const detail = await service.getAuditTemplate(created.id);
      const updated = await service.updateAuditTemplate(created.id, { name: 'Updated via JSON' });
      const copy = await service.createAuditTemplate({ ...detail, name: 'Copy via JSON' });
      await service.deleteAuditTemplate(copy.id);
      return { created, listed, detail, updated };
    }, payload);
    id = data.created.id;
    assert.ok(data.listed.some(item => item.id === id));
    assert.equal(data.detail.name, payload.name); assert.equal(data.updated.name, 'Updated via JSON');
    assert.equal(data.created.createdBy, String(h.actors.admin._id));
    assert.ok(h.wire.filter(item => item.path.startsWith('/api/audit-templates')).every(item => item.actor === 'admin'));
  });
  await t.test('own: list/detail/create/update/delete reject with HTTP 403 and no foreign data', async () => {
    await h.open('own', '/template-test');
    const statuses = await h.page.evaluate(async ({ id, payload }) => {
      const api = window.templateService;
      const results = [];
      for (const call of [() => api.getAuditTemplates(), () => api.getAuditTemplate(id), () => api.createAuditTemplate(payload), () => api.updateAuditTemplate(id, payload), () => api.deleteAuditTemplate(id)]) {
        try { await call(); results.push(200); } catch (error) { results.push(error.response?.status); }
      }
      return results;
    }, { id, payload });
    assert.deepEqual(statuses, [403, 403, 403, 403, 403]);
  });
  await t.test('anonymous request remains 401 with no page errors', async () => {
    await h.open('admin', '/template-test');
    const status = await h.page.evaluate(async id => {
      localStorage.removeItem('inop_auth_token');
      try { await window.templateService.getAuditTemplate(id); return 200; } catch (error) { return error.response?.status; }
    }, id);
    assert.equal(status, 401); assert.deepEqual(h.pageErrors, []);
  });
}));
