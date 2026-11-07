const { publicRuntime } = require('./runtimeConfiguration.service');
// Register before API routers and the catch-all. These routes do not provision,
// inspect audit data, or claim that a configured provider passed a live smoke test.
exports.register = (app, options = {}) => {
  // Port can bind before Mongo is ready; Render must not promote an unready API.
  app.get('/health', (_req, res) => {
    const connected = require('mongoose').connection.readyState === 1;
    return res.status(connected ? 200 : 503).json({ success: connected, status: connected ? 'ok' : 'not-ready' });
  });
  app.get('/version', (_req, res) => {
    res.set('Cache-Control', 'no-store');
    res.status(200).json({ success: true, runtime: publicRuntime(options.env) });
  });
  app.get('/ready', require('./readiness.service').createHandler(options.readiness));
};
