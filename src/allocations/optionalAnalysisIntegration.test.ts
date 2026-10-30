import {describe,it,expect} from 'vitest';
import {analyzeOptionalAllocation} from './optionalAnalysis';
import {partKey,putPartRules,shiftBinaryUo,weightedSummary,type WeightedPart} from './weightedSync';
import type {OptionalAllocations} from './optionalModel';
import type {CanonicalDataset,AnalysisRecord} from '../domain/canonical';
import type {GapState} from '../gaps/store';

const gaps:GapState={requirements:[],resolutions:[]};
const parts:WeightedPart[]=[
 {scope:{kind:'lo',uoId:'uo',loId:'a'},hours:500},
 {scope:{kind:'lo',uoId:'uo',loId:'b'},hours:300},
 {scope:{kind:'uo-overhead',uoId:'uo'},hours:200}
];
const records:AnalysisRecord[]=parts.map((p,i)=>({
 id:'r'+i,metric:'it_hours',value:p.hours,year:2027,activity:'unknown',
 scope:{axis:'work',uoId:'uo',...(p.scope.kind==='lo'?{loId:p.scope.loId}:{})},
 workPart:p.scope.kind==='lo'?'lo':'uo-overhead',granularity:'total',authority:'original',approval:'reported',
 workloadId:'w'+i,source:{datasetId:'ds',sheet:'S',cell:'A'+(i+1)}
}));
const dataset:CanonicalDataset={schemaVersion:2,records};
const base:OptionalAllocations={schemaVersion:2,dimensions:[{id:'impact',name:'Effekt',categories:[{id:'direct',name:'Direkt effekt'},{id:'enabling',name:'Förutsättningar'}],appliesTo:{metrics:['it_hours'],activities:'all'}}],rules:[]};
const initial=new Map(parts.map(p=>[partKey(p.scope),{direct:0,enabling:100}]));
describe('DEV-139: allocation editor -> analysis hours',()=>{
 it('a UO endpoint updates every LO/overhead and analysis receives all 1000 hours',()=>{
  const shifted=shiftBinaryUo(parts,initial,'direct','enabling',100);
  const config=putPartRules(base,'impact',2027,parts,shifted);
  const analysis=analyzeOptionalAllocation(dataset,gaps,config,'impact',{year:2027});
  expect(analysis).toMatchObject({total:1000,allocated:1000,unallocated:0,visible:true});
  expect(analysis.amounts).toEqual({direct:1000,enabling:0});
  expect(weightedSummary(parts,shifted,['direct','enabling']).allocatedHours).toEqual(analysis.amounts);
 });
 it('LO tuning raises its category hours, recalculates UO and preserves other parts',()=>{
  const allDirect=shiftBinaryUo(parts,initial,'direct','enabling',100);
  const tuned=new Map(allDirect).set(partKey(parts[0].scope),{direct:0,enabling:100});
  const config=putPartRules(base,'impact',2027,parts,tuned);
  const analysis=analyzeOptionalAllocation(dataset,gaps,config,'impact',{year:2027});
  expect(analysis.amounts).toEqual({direct:500,enabling:500});
  expect(weightedSummary(parts,tuned,['direct','enabling']).percentages.direct).toBe(50);
  expect(analyzeOptionalAllocation(dataset,gaps,config,'impact',{year:2027,partId:'a'}).amounts.direct).toBe(0);
  expect(analyzeOptionalAllocation(dataset,gaps,config,'impact',{year:2027,partId:'b'}).amounts.direct).toBe(300);
  expect(analyzeOptionalAllocation(dataset,gaps,config,'impact',{year:2027,partId:'uo-overhead:uo'}).amounts.direct).toBe(200);
  expect(analysis.total).toBe(1000);
 });
 it('a partial UO slider produces the same category hours in analysis as in the editor',()=>{
  const shifted=shiftBinaryUo(parts,initial,'direct','enabling',65);
  const saved=putPartRules(base,'impact',2027,parts,shifted);
  const summary=weightedSummary(parts,shifted,['direct','enabling']);
  const analysis=analyzeOptionalAllocation(dataset,gaps,saved,'impact',{year:2027});
  expect(analysis.amounts.direct).toBeCloseTo(650,8);
  expect(analysis.amounts.enabling).toBeCloseTo(350,8);
  expect(analysis.amounts.direct).toBeCloseTo(summary.allocatedHours.direct,8);
  expect(analysis.allocated+analysis.unallocated).toBeCloseTo(analysis.total,8);
 });
});
