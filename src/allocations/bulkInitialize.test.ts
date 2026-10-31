import {describe,it,expect} from 'vitest';
import {bulkInitializeUos,bulkSetPercentages,bulkClearPercentages,previewBulkChange} from './bulkInitialize';
import {effectiveOptionalRule} from './optionalAnalysis';
import type {OptionalAllocations} from './optionalModel';
const data:OptionalAllocations={schemaVersion:2,dimensions:[{id:'impact',name:'Effekt',categories:[{id:'a',name:'A'},{id:'b',name:'B'}],appliesTo:{metrics:['it_hours'],activities:'all'}}],rules:[
 {dimensionId:'impact',year:0,scope:{kind:'lo',uoId:'U1',loId:'L1'},percentages:{a:40,b:60}},
 {dimensionId:'impact',year:2028,scope:{kind:'lo',uoId:'U1',loId:'L1'},percentages:{a:70,b:30}},
 {dimensionId:'impact',year:0,scope:{kind:'uo',uoId:'U2'},percentages:{a:50,b:50}}
]};
describe('DEV-144 bulk UO initialization',()=>{
 it('sets all selected UOs to first endpoint, clearing matching shared child overrides',()=>{
  const next=bulkInitializeUos(data,'impact',0,['U1','U2'],'a');
  expect(next.rules.filter(r=>r.year===0)).toHaveLength(2);
  expect(effectiveOptionalRule(next,'impact',2027,{kind:'lo',uoId:'U1',loId:'L1'}).rule?.percentages).toEqual({a:100,b:0});
  expect(effectiveOptionalRule(next,'impact',2027,{kind:'lo',uoId:'U2',loId:'L2'}).rule?.percentages).toEqual({a:100,b:0});
  expect(effectiveOptionalRule(next,'impact',2028,{kind:'lo',uoId:'U1',loId:'L1'}).rule?.percentages).toEqual({a:70,b:30});
  expect(data.rules).toHaveLength(3);
 });
 it('supports reverse endpoint and isolates a single year',()=>{
  const next=bulkInitializeUos(data,'impact',2028,['U1','U2'],'b');
  expect(effectiveOptionalRule(next,'impact',2028,{kind:'lo',uoId:'U1',loId:'L1'}).rule?.percentages).toEqual({a:0,b:100});
  expect(effectiveOptionalRule(next,'impact',2027,{kind:'lo',uoId:'U1',loId:'L1'}).rule?.percentages).toEqual({a:40,b:60});
 });
 it('rejects invalid inputs without partial changes',()=>{
  expect(()=>bulkInitializeUos(data,'impact',0,['U1'],'unknown')).toThrow('UNKNOWN_CATEGORY');
  expect(()=>bulkInitializeUos(data,'impact',0,[],'a')).toThrow('NO_UOS');
  expect(data.rules).toHaveLength(3);
 });
});

describe('DEV-161 massfördelning och rensning',()=>{
 it('förhandsgranskar exakt antal regler och bevarar årsundantag',()=>{
  expect(previewBulkChange(data,'impact',0,['U1','U2'])).toEqual({uos:2,removedRules:2,loRules:1,overheadRules:0,annualExceptions:1});
  const next=bulkSetPercentages(data,'impact',0,['U1','U2'],{a:35,b:65});
  expect(next.rules.filter(r=>r.year===0)).toHaveLength(2);
  expect(effectiveOptionalRule(next,'impact',2027,{kind:'lo',uoId:'U1',loId:'L1'}).rule?.percentages).toEqual({a:35,b:65});
  expect(effectiveOptionalRule(next,'impact',2028,{kind:'lo',uoId:'U1',loId:'L1'}).rule?.percentages).toEqual({a:70,b:30});
  expect(data.rules).toHaveLength(3);
 });
 it('rensar enbart vald period och återgår till arv från grundregel',()=>{
  const cleared=bulkClearPercentages(data,'impact',2028,['U1']);
  expect(cleared.rules).toHaveLength(2);
  expect(effectiveOptionalRule(cleared,'impact',2028,{kind:'lo',uoId:'U1',loId:'L1'}).rule?.percentages).toEqual({a:40,b:60});
  expect(cleared.rules.find(r=>r.scope.uoId==='U2')).toBeDefined();
 });
 it('avvisar ofullständiga eller ogiltiga procent utan att ändra data',()=>{
  expect(()=>bulkSetPercentages(data,'impact',0,['U1'],{a:110,b:-10})).toThrow('INVALID_PERCENTAGES');
  expect(()=>bulkSetPercentages(data,'impact',0,['U1'],{a:35,b:45})).toThrow('INVALID_PERCENTAGES');
  expect(data.rules).toHaveLength(3);
 });
});
