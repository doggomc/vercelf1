import { describe, expect, it } from 'vitest';
import { calculateProgression } from '../src/features/standings-progression';
import { chartMarkup } from '../src/features/progression-chart';

const drivers = [{points:'43',Driver:{driverId:'one',givenName:'First',familyName:'Driver',code:'ONE'},Constructors:[{name:'Mercedes'}]},{points:'28',Driver:{driverId:'two',givenName:'Second',familyName:'Driver',code:'TWO'},Constructors:[{name:'Mercedes'}]}];
const constructors = [{points:'71',Constructor:{constructorId:'merc',name:'Mercedes'}}];
const result=(driverId:string,points:number)=>({points:String(points),Driver:{driverId},Constructor:{constructorId:'merc'}});
const races=[{round:'1',Results:[result('one',25),result('two',18)]},{round:'2',Results:[result('one',10),result('two',10)]}];
const sprint=[{round:'2',SprintResults:[result('one',8)]}];
describe('points progression',()=>{
  it('adds sprint and grand prix points per round, preserving official order and dashed teammates',()=>{
    const data=calculateProgression(drivers,constructors,races,sprint,2);
    expect(data.rounds).toEqual([1,2]);expect(data.drivers.map(s=>s.values)).toEqual([[25,43],[18,28]]);
    expect(data.constructors[0].values).toEqual([43,71]);expect(data.drivers[1].dashed).toBe(true);
    const svg=chartMarkup(data.rounds,data.drivers,'Drivers: points progression');expect(svg).toContain('stroke-dasharray="6 5"');expect(svg).toContain('ONE');expect(svg).toContain('R2');
  });
  it('refuses mismatched or incomplete data rather than chart incorrect results',()=>{
    expect(()=>calculateProgression(drivers,constructors,races,[],2)).toThrow('not yet in sync');
    expect(()=>calculateProgression(drivers,constructors,races.slice(1),sprint,2)).toThrow('incomplete');
  });
  it('does not include a sprint from a future round',()=>{
    const extra=[...sprint,{round:'3',SprintResults:[result('one',8)]}];
    expect(calculateProgression(drivers,constructors,races,extra,2).drivers[0].values).toEqual([25,43]);
  });
});
