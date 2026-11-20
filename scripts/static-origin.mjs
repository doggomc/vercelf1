#!/usr/bin/env node
/* Optional static offload. No production linking occurs unless F1_ASSET_PROJECT
   is set. Pages and Vercel must build identical assets before HTML is linked. */
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const dist = join(root, 'dist');
const output = join(root, 'pages-static');
const script = fileURLToPath(import.meta.url);
const dirs = ['bundles', 'font-cache', 'assets'];
const labelPattern = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
function labelOf(value) {
  const label = String(value || '').trim().toLowerCase();
  if (!labelPattern.test(label)) throw new Error('Use the Pages project label only (for example freef1-assets), not a URL.');
  return label;
}
function deploymentOrigin(value, label) {
  const url = new URL(value);
  const suffix = `.${label}.pages.dev`;
  const prefix = url.hostname.endsWith(suffix) ? url.hostname.slice(0, -suffix.length) : '';
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.pathname !== '/' || url.search || url.hash || !/^[a-f0-9]{7,64}$/.test(prefix)) throw new Error('Expected a deployment-specific HTTPS Pages origin for this project.');
  return url.origin;
}
function files(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Symlink not allowed in assets: ${path}`);
    return entry.isDirectory() ? files(path) : entry.isFile() ? [path] : [];
  }).sort();
}
function fingerprint() {
  const hash = createHash('sha256');
  hash.update('freef1-static-offload-v1\0');
  hash.update(readFileSync(script));
  for (const dir of dirs) {
    const path = join(dist, dir);
    if (!existsSync(path)) throw new Error(`Missing build output: ${dir}`);
    for (const file of files(path)) {
      const name = relative(dist, file).replaceAll('\\', '/');
      const data = readFileSync(file);
      hash.update(`${name}\0${data.length}\0`); hash.update(data); hash.update('\0');
    }
  }
  return hash.digest('hex');
}
// These are build-owned public static paths, not page routes or API endpoints.
function rewrite(text, origin) {
  return text.replace(/(?<![a-zA-Z0-9:/])\/(assets|bundles|font-cache)\//g, `${origin}/$1/`);
}
function pages(label, value) {
  const origin = deploymentOrigin(value, label);
  const digest = fingerprint();
  rmSync(output, { recursive: true, force: true }); mkdirSync(output, { recursive: true });
  for (const dir of dirs) cpSync(join(dist, dir), join(output, dir), { recursive: true });
  for (const file of files(join(output, 'bundles'))) {
    if (!/\.(?:js|css)$/.test(file)) continue;
    const source = readFileSync(file, 'utf8'); const transformed = rewrite(source, origin);
    if (transformed !== source) writeFileSync(file, transformed);
  }
  const metadata = { version: 1, origin, fingerprint: digest };
  writeFileSync(join(output, 'release.json'), JSON.stringify(metadata) + '\n');
  writeFileSync(join(output, '_headers'), '/bundles/*\n  Access-Control-Allow-Origin: *\n  Cache-Control: public, max-age=31536000, immutable\n/font-cache/*\n  Access-Control-Allow-Origin: *\n  Cache-Control: public, max-age=31536000, immutable\n/assets/*\n  Access-Control-Allow-Origin: *\n  Cache-Control: public, max-age=86400, must-revalidate\n/release.json\n  Access-Control-Allow-Origin: *\n  Cache-Control: public, max-age=0, must-revalidate\n');
  writeFileSync(join(output, '404.html'), '<!doctype html><title>Not found</title><h1>Not found</h1>\n');
  console.log(`Static assets prepared: ${files(output).length} files, fingerprint ${digest}`);
}
async function json(url) {
  const r = await fetch(url, { cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(10000) });
  if (!r.ok) throw new Error(`Release metadata HTTP ${r.status}`);
  const text = await r.text(); if (text.length > 4096) throw new Error('Release metadata too large');
  return JSON.parse(text);
}
async function link(label) {
  const digest = fingerprint();
  const endpoint = `https://${label}.pages.dev/release.json`;
  let lastError;
  for (let attempt = 0; attempt < 18; attempt++) {
    try {
      const live = await json(endpoint); const origin = deploymentOrigin(live.origin, label);
      if (live.version !== 1 || live.fingerprint !== digest) throw new Error('Pages release does not match this build');
      const pinned = await json(`${origin}/release.json`);
      if (pinned.version !== 1 || pinned.origin !== origin || pinned.fingerprint !== digest) throw new Error('Pinned release does not match');
      let count = 0;
      for (const path of files(dist)) {
        if (!path.endsWith('.html')) continue;
        const source = readFileSync(path, 'utf8'); const transformed = rewrite(source, origin);
        if (source !== transformed) { writeFileSync(path, transformed); count++; }
      }
      if (!count) throw new Error('No HTML was linked');
      console.log(`Linked ${count} HTML files to verified release ${origin}`); return;
    } catch (error) { lastError = error; if (attempt < 17) await new Promise(r => setTimeout(r, 5000)); }
  }
  throw new Error(`Unable to link matching Pages assets: ${lastError?.message}`);
}
function configure(label) {
  const path = join(root, 'vercel.json'); const json = JSON.parse(readFileSync(path, 'utf8'));
  const csp = json.headers.flatMap(r => r.headers || []).find(h => h.key === 'Content-Security-Policy');
  if (!csp) throw new Error('CSP header not found');
  const allowed = `https://*.${label}.pages.dev`;
  const parts = csp.value.split(';').map(s => s.trim()).filter(Boolean);
  for (const directive of ['script-src', 'style-src', 'font-src', 'img-src']) {
    const i = parts.findIndex(x => x.startsWith(`${directive} `));
    if (i < 0) throw new Error(`CSP ${directive} missing`);
    if (!parts[i].split(/\s+/).includes(allowed)) parts[i] += ` ${allowed}`;
  }
  csp.value = parts.join('; ');
  writeFileSync(path, JSON.stringify(json, null, 2) + '\n');
  console.log(`Configured asset CSP for ${label}.pages.dev`);
}
const [action, arg] = process.argv.slice(2);
if (action === 'configure') configure(labelOf(arg));
else if (action === 'pages') pages(labelOf(arg), process.env.CF_PAGES_URL);
else if (action === 'link') {
  if (process.env.F1_ASSET_PROJECT) await link(labelOf(process.env.F1_ASSET_PROJECT));
  else console.log('Static offload not configured; Vercel assets remain local.');
} else throw new Error('Usage: static-origin.mjs configure <project-label> | pages <project-label> | link');
