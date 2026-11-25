import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
describe('native scrollbars',()=>{
 it('styles page and timing scrollbars without changing native scroll input',()=>{
  const css=readFileSync('src/styles/scrollbars.css','utf8');
  expect(css).toContain('html::-webkit-scrollbar');expect(css).toContain('.compact-timing-scroll::-webkit-scrollbar-thumb');
  expect(css).toContain('forced-colors: active');expect(css).toContain('prefers-reduced-motion: reduce');expect(css).toContain('scrollbar-width:thin');
  for(const name of ['src/styles/layout.css','src/styles/app.css'])expect(readFileSync(name,'utf8')).toContain("@import './scrollbars.css'");
 });
 it('makes the timing list keyboard accessible',()=>{const html=readFileSync('cockpit.html','utf8');expect(html).toContain('class="compact-timing-scroll" tabindex="0" role="region" aria-label="Live timing standings"');});
});
