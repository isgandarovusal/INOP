const { publicRuntime } = require('./runtimeConfiguration.service');
// Register before API routers and the catch-all. These routes do not provision,
// inspect audit data, or claim that a configured provider passed a live smoke test.
exports.register = (app, options = {}) => {
  app.get('/health', (_req, res) => res.status(200).json({ success: true, status: 'ok' }));
  app.get('/version', (_req, res) => {
    res.set('Cache-Control', 'no-store');
    res.status(200).json({ success: true, runtime: publicRuntime(options.env) });
  });
  app.get('/ready', require('./readiness.service').createHandler(options.readiness));
};
