// Explicit Docker integration suite; native application tests do not require Docker.
// Run: node --test Backend/tests/dockerSecretIsolation.docker.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const { execFileSync } = require('node:child_process');
const repository = path.resolve(__dirname, '../..');

function docker(args, config, options = {}) {
  return execFileSync('docker', args, { env: { ...process.env, DOCKER_CONFIG: config }, encoding: 'utf8', timeout: 120000, maxBuffer: 512 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'], ...options });
}
function write(root, file, content) {
  const target = path.join(root, file); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, content);
}
function scanLayers(archive, marker) {
  const manifest = JSON.parse(execFileSync('tar', ['-xOf', archive, 'manifest.json'], { encoding: 'utf8' }));
  for (const image of manifest) for (const file of image.Layers) {
    let bytes = execFileSync('tar', ['-xOf', archive, file], { maxBuffer: 512 * 1024 * 1024 });
    if (bytes[0] === 0x1f && bytes[1] === 0x8b) bytes = zlib.gunzipSync(bytes);
    assert.ok(!bytes.includes(marker), 'A synthetic secret entered an image layer, including a possibly deleted layer.');
  }
}

// No real checkout secret is ever copied into these scratch fixtures.
const secretFiles = ['.env', '.env.production', 'nested/.env.preview', '.aws/credentials', '.npmrc',
  'credentials.json', 'controllers/private.key', 'models/private.pem', 'services/token.json', 'public/secrets.yaml',
  'src/id_rsa', 'src/nested/service-account.json', 'src/private.p12', 'uploads/private.txt',
  'tests/fixture.txt', 'scripts/seedUsers.js', 'node_modules/local-secret.txt'];

test('Docker contexts and all image layers exclude synthetic secrets; runtime injection survives', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'inop-docker-secrets-'));
  const config = path.join(root, 'docker-config'); fs.mkdirSync(config);
  const marker = Buffer.from('synthetic-' + crypto.randomBytes(24).toString('hex'));
  const tags = [], containers = [];
  try {
    for (const kind of ['root', 'Backend', 'Frontend']) await t.test(`${kind}: actual .dockerignore rejects secret files from build context`, () => {
      const context = path.join(root, kind + '-context'); fs.mkdirSync(context);
      write(context, '.dockerignore', fs.readFileSync(path.join(repository, kind === 'root' ? '.dockerignore' : kind + '/.dockerignore')));
      write(context, 'Dockerfile', 'FROM scratch\nCOPY . /app\n');
      write(context, 'allowed.txt', 'non-secret fixture');
      for (const file of secretFiles) write(context, file, marker);
      const tag = 'inop-secret-context:' + crypto.randomBytes(6).toString('hex');
      docker(['build', '--quiet', '--tag', tag, context], config); tags.push(tag);
      const container = docker(['create', tag, '/not-run'], config).trim(); containers.push(container);
      const exported = path.join(root, kind + '-filesystem.tar'); docker(['export', '-o', exported, container], config);
      const files = execFileSync('tar', ['-tf', exported], { encoding: 'utf8' }).split('\n');
      assert.ok(files.includes('app/allowed.txt')); assert.ok(!fs.readFileSync(exported).includes(marker), 'Context filtering leaked a canary.');
      const archive = path.join(root, kind + '-layers.tar'); docker(['save', '-o', archive, tag], config); scanLayers(archive, marker);
    });
    for (const kind of ['Backend', 'Frontend']) await t.test(`${kind}: production Dockerfile fixture build and every layer remain secret-free`, () => {
      const context = path.join(root, kind + '-production'); fs.mkdirSync(context);
      for (const file of ['Dockerfile', '.dockerignore']) write(context, file, fs.readFileSync(path.join(repository, kind, file)));
      const pkg = { name: 'isolated-image-fixture', version: '1.0.0', scripts: { build: 'node src/build.cjs' } };
      write(context, 'package.json', JSON.stringify(pkg));
      write(context, 'package-lock.json', JSON.stringify({ name: pkg.name, version: pkg.version, lockfileVersion: 3, packages: { '': { name: pkg.name, version: pkg.version } } }));
      write(context, 'server.js', ''); write(context, 'swagger.js', '');
      for (const directory of ['controllers', 'middleware', 'models', 'routes', 'services']) write(context, directory + '/allowed.js', '// fixture');
      write(context, 'src/build.cjs', "const fs=require('fs');fs.mkdirSync('dist');fs.writeFileSync('dist/index.html','Non-secret fixture');");
      write(context, 'public/allowed.txt', 'fixture');
      write(context, 'tsconfig.json', '{}'); write(context, 'vite.config.ts', ''); write(context, 'index.html', 'fixture');
      if (kind === 'Frontend') write(context, 'nginx.conf', fs.readFileSync(path.join(repository, 'Frontend/nginx.conf')));
      for (const file of secretFiles) write(context, file, marker);
      const tag = 'inop-secret-production:' + crypto.randomBytes(6).toString('hex');
      const buildSecret = path.join(root, 'install-secret.json');
      fs.writeFileSync(buildSecret, JSON.stringify({ JWT_SECRET: marker.toString() }), { mode: 0o600 });
      docker(['build', '--quiet', '--secret', 'id=npm-network,src=' + buildSecret, '--tag', tag, context], config); tags.push(tag);
      const archive = path.join(root, kind + '-production-layers.tar'); docker(['save', '-o', archive, tag], config); scanLayers(archive, marker);
      assert.ok(!Buffer.from(docker(['image', 'inspect', tag, '--format', '{{json .Config.Env}}'], config)).includes(marker));
      if (kind === 'Backend') {
        const envFile = path.join(root, 'runtime.env');
        write(root, 'runtime.env', 'JWT_SECRET=' + marker + '\nMONGO_URI=synthetic-runtime-binding\n'); fs.chmodSync(envFile, 0o600);
        const output = docker(['run', '--rm', '--env-file', envFile, '--entrypoint', 'node', tag, '-e', "console.log(JSON.stringify({jwtPresent:Boolean(process.env.JWT_SECRET),mongoPresent:Boolean(process.env.MONGO_URI)}))"], config);
        assert.deepEqual(JSON.parse(output), { jwtPresent: true, mongoPresent: true });
      }
    });
  } finally {
    // Only exact resources created by this test are removed; no prune/reset/clean.
    for (const container of containers) docker(['rm', container], config);
    for (const tag of tags) docker(['image', 'rm', tag], config);
    fs.rmSync(root, { recursive: true });
  }
});
