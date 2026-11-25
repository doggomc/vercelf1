import {describe,it,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {teamLogo,renderCompactTiming} from '../src/features/compact-timing';
const read=(p:string)=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
describe('cockpit compact timing',()=>{
 it('uses bundled team logos without image network requests',()=>{
   for (const team of ['Ferrari','Mercedes','McLaren','Red Bull Racing','Aston Martin','Williams','Haas F1 Team','Audi','RB F1 Team','Alpine F1 Team','Cadillac F1 Team']) expect(teamLogo(team)).toMatch(/^data:image\/png;base64,/);
   expect(teamLogo('unknown')).toBe('');
 });
 it('renders driver, logo, tyre and the correct race and practice gap',()=>{
   const make=(tag='')=>({tag,children:[] as any[],textContent:'',title:'',src:'',alt:'',className:'',dataset:{} as Record<string,string>,style:{setProperty:vi.fn()},append(...nodes:any[]){this.children.push(...nodes)},replaceChildren(node:any){this.children=node.children}});
   vi.stubGlobal('document',{createElement:(tag:string)=>make(tag),createDocumentFragment:()=>make()});
   const row={num:'16',pos:'2',tla:'LEC',lastName:'Leclerc',fullName:'Charles Leclerc',teamName:'Ferrari',teamColor:'#dc0000',isOut:false,tyre:{code:'S',age:'10'},cells:[{text:'+1.234'},{text:'+0.500'},{text:''},{text:''},{text:''},{text:''},{text:''}],tail:''};
   const tbody=make();
   renderCompactTiming({rows:[row],isRace:true} as any,tbody as any);
   const cells=tbody.children[0].children;
   expect(cells[1].children[0].children[0].src).toMatch(/^data:image/);
   expect(cells[1].children[0].children[1].textContent).toBe('Leclerc');
   expect(cells[2].children[0].textContent).toBe('S');expect(cells[3].textContent).toBe('+1.234');
   renderCompactTiming({rows:[row],isRace:false} as any,tbody as any);
   expect(tbody.children[0].children[3].textContent).toBe('+0.500');
   vi.unstubAllGlobals();
 });
 it('starts hidden, uses a separate rail, and only connects on request',()=>{
   const html=read('cockpit.html'), app=read('src/app.ts'), css=read('src/styles/app.css');
   expect(html).toContain('id="compactTimingPanel" aria-label="Live timing" hidden');
   expect(html).toContain('aria-controls="compactTimingPanel"');
   expect(app).toContain("import('./features/compact-timing')");
   expect(app).toContain('compactTimingController?.close()');
   expect(html).toContain('id="sideTimingEnable"');
   expect(html).toContain('Enable it here');
   expect(app).toContain("document.getElementById('sideTimingEnable')?.addEventListener('click', () => { void setCompactTiming(true); })");
   expect(css).toContain('.compact-timing { grid-column:2;');
   expect(css).toContain('@media(max-width: 1100px) { .compact-timing { grid-column:1;');
 });
});
