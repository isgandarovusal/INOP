const rateLimit = require('express-rate-limit');

// Render forwards public HTTPS traffic to a non-public application port.
// Trust only the immediate platform hop, never the whole supplied XFF chain.
// Other/local runtimes retain direct-peer attribution. See deployment notes.
function configureTrustedProxy(app, env = process.env) {
  app.set('trust proxy', env.RENDER === 'true' && env.RENDER_SERVICE_TYPE === 'web' && env.INOP_TRUST_RENDER_PROXY !== 'false' ? 1 : false);
}

function createApiRateLimiter(options = {}) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { message: 'Çoxlu sorğu göndərildi, xahiş olunur 15 dəqiqə sonra yenidən cəhd edin.' },
    ...options,
  });
}

module.exports = { configureTrustedProxy, createApiRateLimiter };
