import {describe,it,expect} from 'vitest';
import {effectiveOptionalRule,analyzeOptionalAllocation} from './optionalAnalysis';
import {parseOptionalAllocations,type OptionalAllocations} from './optionalModel';
import type {CanonicalDataset,AnalysisRecord} from '../domain/canonical';
import type {GapState} from '../gaps/store';
const make=(year:number,loId:string,value:number):AnalysisRecord=>({
 id:year+loId,metric:'it_hours',value,year,activity:'unknown',
 scope:{axis:'work',uoId:'uo',loId},workPart:'lo',granularity:'total',
 authority:'original',approval:'reported',workloadId:year+loId,
 source:{datasetId:'source',sheet:'Sheet',cell:year+loId}
});
const data:CanonicalDataset={schemaVersion:2,records:[make(2027,'a',100),make(2028,'a',200),make(2029,'a',300)]};
const gaps:GapState={requirements:[],resolutions:[]};
const config:OptionalAllocations={schemaVersion:2,dimensions:[{id:'d',name:'Effekt',categories:[{id:'direct',name:'Direkt'},{id:'other',name:'Indirekt'}],appliesTo:{metrics:['it_hours'],activities:'all'}}],rules:[
 {dimensionId:'d',year:0,scope:{kind:'lo',uoId:'uo',loId:'a'},percentages:{direct:80,other:20}},
 {dimensionId:'d',year:2028,scope:{kind:'lo',uoId:'uo',loId:'a'},percentages:{direct:60,other:40}}
]};
describe('DEV-142 shared rules and year overrides',()=>{
 it('accepts shared year 0 and preserves schema version',()=>{
  expect(parseOptionalAllocations(config).schemaVersion).toBe(2);
 });
 it('applies the default except for explicitly overridden years',()=>{
  const get=(year:number)=>effectiveOptionalRule(config,'d',year,{kind:'lo',uoId:'uo',loId:'a'}).rule?.percentages.direct;
  expect([get(2027),get(2028),get(2029)]).toEqual([80,60,80]);
  expect(analyzeOptionalAllocation(data,gaps,config,'d').amounts.direct).toBe(440);
 });
 it('a changed shared rule leaves the annual exception unchanged',()=>{
  const next:OptionalAllocations={...config,rules:config.rules.map(r=>r.year===0?{...r,percentages:{direct:20,other:80}}:r)};
  expect(analyzeOptionalAllocation(data,gaps,next,'d').amounts.direct).toBe(200);
  expect(effectiveOptionalRule(next,'d',2028,{kind:'lo',uoId:'uo',loId:'a'}).rule?.percentages.direct).toBe(60);
 });
 it('year-specific UO rule overrides a shared LO rule for that year',()=>{
  const parent:OptionalAllocations={...config,rules:[...config.rules,{dimensionId:'d',year:2029,scope:{kind:'uo',uoId:'uo'},percentages:{direct:100,other:0}}]};
  expect(effectiveOptionalRule(parent,'d',2029,{kind:'lo',uoId:'uo',loId:'a'}).rule?.percentages.direct).toBe(100);
 });
});
