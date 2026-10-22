import {describe,it,expect} from 'vitest';
import {emptySemantic} from '../domain/semantic';
import {withoutSources} from './sourceManagement';
describe('source removal integrity',()=>{
 it('removes only selected source observations while preserving manually shared entities and relations',()=>{
  const d=emptySemantic();d.entities=[{id:'uo1',kind:'uo',name:'UO',aliases:[]}];
  d.observations=['a','b'].map((datasetId,i)=>({id:'o'+i,entityId:'uo1',measureId:'it_hours',value:i+1,kind:'detail' as const,period:{year:2027},planningVersion:'v1',scenario:'need',quality:'reported' as const,source:{datasetId,fileName:datasetId+'.xlsx',sheet:'S',cell:'A1'}}));
  const before=JSON.stringify(d);
  const cleaned=withoutSources(d,['a']);
  expect(cleaned.observations.map(o=>o.source.datasetId)).toEqual(['b']);
  expect(cleaned.entities).toEqual(d.entities);
  expect(cleaned.relations).toEqual(d.relations);
  expect(JSON.stringify(d)).toBe(before);
 });
 it('supports clearing multiple sources without affecting the measure catalog',()=>{
  const d=emptySemantic();expect(withoutSources(d,['a','b']).measures).toEqual(d.measures);
 });
});
