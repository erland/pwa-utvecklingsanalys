import {describe,expect,it} from 'vitest';
import {groupForUo,groupOverlap,validateGroupModels,type UoGroupModel} from './groupModels';
import {emptySemantic,type Observation} from '../domain/semantic';
import {analyze} from './query';
import {buildPackage,parsePackage,mergedPackage,conflicts} from '../config/packages';
const model:UoGroupModel={id:'model-1',name:'Verksamhetsgrupper',groups:[{id:'g1',name:'Första',uoIds:['u1','u2']},{id:'g2',name:'Andra',uoIds:['u2','u3']}]};
describe('UO group models',()=>{
 it('validates identity and duplicate members',()=>{
  expect(()=>validateGroupModels([model])).not.toThrow();
  expect(()=>validateGroupModels([model,model])).toThrow('DUPLICATE_GROUP_MODEL');
  expect(()=>validateGroupModels([{...model,groups:[{...model.groups[0],uoIds:['u1','u1']}]}])).toThrow('DUPLICATE_GROUP');
 });
 it('reports overlap and assigns only first membership',()=>{
  expect(groupOverlap(model)).toEqual(['u2']);
  expect(groupForUo(model,'u2')?.id).toBe('g1');
  expect(groupForUo(model,'unknown')).toBeUndefined();
 });
 it('analyzes each source once even when groups overlap',()=>{
  const d=emptySemantic();d.entities=['u1','u2','u3'].map(id=>({id,name:id,kind:'uo' as const,aliases:[]}));
  d.observations=['u1','u2','u3'].map((entityId,i):Observation=>({id:'o'+i,entityId,measureId:'it_hours',value:(i+1)*10,kind:'detail',period:{year:2027},scenario:'need',planningVersion:'2027',quality:'reported',source:{datasetId:'ds',fileName:'x.xlsx',sheet:'Sheet1',cell:'A'+i}}));
  const result=analyze(d,{measureId:'it_hours',groupBy:'uo-group',groupModel:model});
  expect(result.total).toBe(60);expect(result.rows.map(r=>[r.label,r.value])).toEqual([['Första',30],['Andra',30]]);
 });
 it('roundtrips configuration and requires explicit conflicting import',()=>{
  const pkg=buildPackage(undefined,undefined,'definitions-only',[model]);
  expect(parsePackage(JSON.parse(JSON.stringify(pkg))).sections.groups).toEqual([model]);
  const changed=buildPackage(undefined,undefined,'definitions-only',[{...model,name:'Ny titel'}]);
  expect(conflicts(pkg,changed)).toHaveLength(1);
  expect(()=>mergedPackage(pkg,changed,'reject')).toThrow('CONFLICTS_REQUIRE_RESOLUTION');
  expect(mergedPackage(pkg,changed,'replace').sections.groups?.[0].name).toBe('Ny titel');
 });
});
