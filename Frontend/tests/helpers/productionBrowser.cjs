const fs = require('node:fs/promises'), path = require('node:path'), os = require('node:os');
const { execFileSync, spawnSync } = require('node:child_process');
const frontend = path.resolve(__dirname, '../..'), repo = path.dirname(frontend);
const harness = `import React from 'react';import {createRoot} from 'react-dom/client';import {BrowserRouter} from 'react-router-dom';import {AuthContext} from '/src/Context/AuthContext.ts';import i18n from '/src/i18n/index.ts';import '/src/Styles/recruitment.css';import Apps from '/src/Pages/Recruitment/Applications/ApplicationsList.tsx';import api from '/src/api/axios.ts';api.defaults.baseURL='/api';window.changeLanguage=l=>i18n.changeLanguage(l);createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode,null,React.createElement(BrowserRouter,null,React.createElement(AuthContext.Provider,{value:{user:window.testUser,isLoading:false}},React.createElement(Apps)))));`;
exports.productionHRBuild = async (sha, customHarness) => {
  if (sha !== 'working' && !/^[a-f0-9]{40}$/.test(sha)) throw Error('A complete source commit SHA or explicit working snapshot is required.');
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'inop-hr-prod-benchmark-'));
  // Archive only source; never copy .env, uploads, credentials or user changes.
  if (sha === 'working') await fs.cp(path.join(frontend, 'src'), path.join(root, 'src'), { recursive: true });
  else {
    const archive = execFileSync('git', ['archive', sha, 'Frontend/src'], { cwd: repo, maxBuffer: 64 * 1024 * 1024 });
    const extracted = spawnSync('tar', ['-x', '-C', root, '--strip-components=1'], { input: archive });
    if (extracted.status !== 0) throw Error('Owned source archive extraction failed.');
  }
  await fs.symlink(path.join(frontend, 'node_modules'), path.join(root, 'node_modules'), 'dir');
  await fs.writeFile(path.join(root, 'index.html'), '<!doctype html><html lang="az"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/benchmark.jsx"></script></body></html>', { flag: 'wx' });
  await fs.writeFile(path.join(root, 'benchmark.jsx'), customHarness || harness, { flag: 'wx' });
  // Keep Vite's build worker pools out of the measuring API/browser process.
  // Exit this dedicated build child only after build() has completed its writes.
  const code = `const {build}=await import(${JSON.stringify(path.join(frontend, 'node_modules/vite/dist/node/index.js'))});const react=(await import(${JSON.stringify(path.join(frontend, 'node_modules/@vitejs/plugin-react/dist/index.js'))})).default;await build({root:${JSON.stringify(root)},configFile:false,envDir:${JSON.stringify(root)},mode:'production',logLevel:'error',plugins:[react()],define:{'import.meta.env.VITE_API_BASE_URL':'"/api"','import.meta.env.VITE_ENABLE_SPEED_INSIGHTS':'false'},build:{manifest:"hr-route-manifest.json",outDir:${JSON.stringify(path.join(root, 'dist'))},emptyOutDir:false}});process.exit(0);`;
  execFileSync(process.execPath, ['--input-type=module', '-e', code], { cwd: root, timeout: 60000, stdio: ['ignore', 'pipe', 'pipe'] });
  return { sha, root, dist: path.join(root, 'dist'), mode: 'production' };
};
