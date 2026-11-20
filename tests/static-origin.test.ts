import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const script = readFileSync('scripts/static-origin.mjs');
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'freef1-cdn-'));
  for (const p of ['scripts', 'dist/bundles', 'dist/font-cache', 'dist/assets']) mkdirSync(join(root, p), { recursive: true });
  writeFileSync(join(root, 'scripts/static-origin.mjs'), script);
  writeFileSync(join(root, 'dist/bundles/app-test.js'), 'const flag = `/assets/flags/${code}.png`; import("./feature-test.js");');
  writeFileSync(join(root, 'dist/bundles/feature-test.js'), 'export const feature = true;');
  writeFileSync(join(root, 'dist/font-cache/a.woff2'), 'font');
  writeFileSync(join(root, 'dist/assets/image.png'), 'image');
  writeFileSync(join(root, 'dist/index.html'), '<a href="/cockpit">Watch</a><script type="module" src="/bundles/app-test.js"></script><img src="/assets/image.png">');
  const csp = "default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self'; connect-src 'self'";
  writeFileSync(join(root, 'vercel.json'), JSON.stringify({headers:[{headers:[{key:'Content-Security-Policy',value:csp}]}]}));
  return root;
}
function run(root: string, args: string[], env: Record<string,string> = {}) {
  return spawnSync(process.execPath, [join(root, 'scripts/static-origin.mjs'), ...args], {cwd:root, env:{...process.env,...env}, encoding:'utf8'});
}
describe('static asset offload', () => {
  it('leaves the normal build unchanged when not configured', () => {
    const root=fixture(); try {
      expect(run(root,['link'],{F1_ASSET_PROJECT:''}).status).toBe(0);
      expect(readFileSync(join(root,'dist/index.html'),'utf8')).toContain('src="/bundles/app-test.js"');
    } finally {rmSync(root,{recursive:true,force:true});}
  });
  it('stages only assets, pins the origin, validates both releases and links HTML', () => {
    const root=fixture(); try {
      const origin='https://a1b2c3d4.test-assets.pages.dev';
      expect(run(root,['pages','test-assets'],{CF_PAGES_URL:origin}).status).toBe(0);
      expect(readFileSync(join(root,'pages-static/bundles/app-test.js'),'utf8')).toContain(`${origin}/assets/flags/`);
      expect(readFileSync(join(root,'pages-static/_headers'),'utf8')).toContain('Access-Control-Allow-Origin: *');
      const mock = `import {readFileSync} from 'node:fs'; const meta=JSON.parse(readFileSync(${JSON.stringify(join(root,'pages-static/release.json'))})); globalThis.fetch=async url=>{if(!String(url).endsWith('/release.json')) throw Error('bad url'); return new Response(JSON.stringify(meta),{status:200})};`;
      writeFileSync(join(root,'mock.mjs'),mock);
      expect(run(root,['link'],{F1_ASSET_PROJECT:'test-assets',NODE_OPTIONS:`--import=${join(root,'mock.mjs')}`}).status).toBe(0);
      const html=readFileSync(join(root,'dist/index.html'),'utf8');
      expect(html).toContain(`src="${origin}/bundles/app-test.js"`);
      expect(html).toContain(`src="${origin}/assets/image.png"`);
      expect(html).toContain('href="/cockpit"');
      expect(run(root,['configure','test-assets']).status).toBe(0);
      const csp=JSON.parse(readFileSync(join(root,'vercel.json'),'utf8')).headers[0].headers[0].value;
      expect(csp).toContain('https://*.test-assets.pages.dev'); expect(csp).not.toContain('https://*.pages.dev');
    } finally {rmSync(root,{recursive:true,force:true});}
  });
  it('fails closed on a mismatch without modifying HTML and rejects untrusted origins', () => {
    const root=fixture(); try {
      expect(run(root,['pages','test-assets'],{CF_PAGES_URL:'https://evil.example'}).status).not.toBe(0);
      const mock = `globalThis.setTimeout=(f)=>{f();return 0}; globalThis.fetch=async()=>new Response(JSON.stringify({version:1,origin:'https://a1b2c3d4.test-assets.pages.dev',fingerprint:'bad'}),{status:200});`;
      writeFileSync(join(root,'mock.mjs'),mock);
      const before=readFileSync(join(root,'dist/index.html'),'utf8');
      expect(run(root,['link'],{F1_ASSET_PROJECT:'test-assets',NODE_OPTIONS:`--import=${join(root,'mock.mjs')}`}).status).not.toBe(0);
      expect(readFileSync(join(root,'dist/index.html'),'utf8')).toBe(before);
      expect(run(root,['configure','https://evil.test']).status).not.toBe(0);
    } finally {rmSync(root,{recursive:true,force:true});}
  });
});
