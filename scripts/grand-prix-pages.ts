import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import type { Plugin } from 'vite';
import { schedule } from '../src/data/schedule';
import { grandPrixSlug, displayRoundName } from '../src/pages/schedule-format';
const ROOT = resolve(import.meta.dirname, '..');
const origin = (process.env.SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'https://freef1-live.vercel.app')).replace(/\/+$/, '');
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c] ?? c));
export function grandPrixPages(): Plugin {
  return { name:'freef1-grand-prix-pages', apply:'build', closeBundle:{order:'post', handler() {
    const dist = join(ROOT,'dist'); const templatePath = join(dist,'grand-prix.html');
    if (!existsSync(templatePath)) throw new Error('Grand Prix template was not built');
    const template = readFileSync(templatePath,'utf8'); const used = new Set<string>();
    for (const event of schedule) {
      const slug = grandPrixSlug(event); if (used.has(slug)) throw new Error(`Duplicate race slug ${slug}`); used.add(slug);
      const title = `${displayRoundName(event)} 2026 — Schedule and results | FreeF1`;
      const url = `${origin}/grand-prix/2026/${slug}/`;
      const html = template.replaceAll('Grand Prix — FreeF1', esc(title)).replace('FreeF1 Grand Prix weekend schedule and results.', esc(`${displayRoundName(event)} 2026 at ${event.circuit}. Session times and race results on FreeF1.`)).replace('</head>', `<link rel="canonical" href="${url}">\n<meta property="og:url" content="${url}">\n</head>`);
      const dir = join(dist,'grand-prix','2026',slug); mkdirSync(dir,{recursive:true}); writeFileSync(join(dir,'index.html'),html);
    }
    const sitemapPath = join(dist, 'sitemap.xml');
    if (existsSync(sitemapPath)) {
      const sitemap = readFileSync(sitemapPath, 'utf8');
      const entries = [...used].map(slug => `  <url><loc>${esc(origin)}/grand-prix/2026/${slug}/</loc></url>`).join('\n');
      if (!sitemap.includes('/grand-prix/2026/')) writeFileSync(sitemapPath, sitemap.replace('</urlset>', `${entries}\n</urlset>`));
    }
    console.log(`grand prix pages: ${used.size} written`);
  }}};
}
