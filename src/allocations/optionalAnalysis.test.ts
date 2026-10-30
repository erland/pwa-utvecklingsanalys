import {describe,it,expect} from 'vitest';
import {analyzeOptionalAllocation,effectiveOptionalRule} from './optionalAnalysis';
import type {OptionalAllocations} from './optionalModel';
import type {CanonicalDataset,AnalysisRecord} from '../domain/canonical';
import type {GapState} from '../gaps/store';
const gaps:GapState={requirements:[],resolutions:[]};
const config:OptionalAllocations={schemaVersion:2,dimensions:[{id:'d',name:'Effekt',categories:[{id:'direct',name:'Direkt'},{id:'enable',name:'Förutsättningar'}],appliesTo:{metrics:['it_hours'],activities:'all'}}],rules:[
 {dimensionId:'d',year:2027,scope:{kind:'uo',uoId:'uo'},percentages:{direct:60,enable:30}},
 {dimensionId:'d',year:2027,scope:{kind:'lo',uoId:'uo',loId:'a'},percentages:{direct:90,enable:10}},
 {dimensionId:'d',year:2028,scope:{kind:'uo',uoId:'uo'},percentages:{direct:100}}
]};
const record=(id:string,year:number,value:number,loId?:string,workPart?:AnalysisRecord['workPart']):AnalysisRecord=>({id,metric:'it_hours',value,year,activity:'unknown',scope:{axis:'work',uoId:'uo',...(loId?{loId}:{})},granularity:'total',workPart,authority:'original',approval:'reported',workloadId:id,source:{datasetId:'ds',sheet:'S',cell:id}});
const data:CanonicalDataset={schemaVersion:2,records:[record('lo-a',2027,100,'a','lo'),record('lo-b',2027,200,'b','lo'),record('overhead',2027,50,undefined,'uo-overhead'),record('next',2028,40,'a','lo')]};
describe('DEV-132 optional allocation calculations',()=>{
 it('inherits UO proposal and overrides LO while keeping overhead separate and balance intact',()=>{
  const result=analyzeOptionalAllocation(data,gaps,config,'d',{year:2027});
  expect(result).toMatchObject({total:350,allocated:325,unallocated:25,visible:true,unit:'h'});
  expect(result.amounts).toEqual({direct:240,enable:85});
  expect(effectiveOptionalRule(config,'d',2027,{kind:'lo',uoId:'uo',loId:'b'}).origin).toBe('inherited');
  expect(effectiveOptionalRule(config,'d',2027,{kind:'lo',uoId:'uo',loId:'a'}).origin).toBe('own');
 });
 it('computes each year separately and keeps a filtered LO distinct',()=>{
  const all=analyzeOptionalAllocation(data,gaps,config,'d');
  expect(all.total).toBe(390);
  expect(all.amounts.direct).toBe(280);
  const lo=analyzeOptionalAllocation(data,gaps,config,'d',{year:2027,loIds:['a']});
  expect(lo.total).toBe(100);expect(lo.amounts.direct).toBe(90);
 });
 it('does not show dimensions without applicable allocation rules',()=>{
  const empty={...config,rules:[]};
  const result=analyzeOptionalAllocation(data,gaps,empty,'d');
  expect(result).toMatchObject({visible:false,allocated:0,unallocated:390,total:390});
 });
 it('never mutates canonical records or adds original volume',()=>{
  const before=JSON.stringify(data);
  analyzeOptionalAllocation(data,gaps,config,'d');
  expect(JSON.stringify(data)).toBe(before);
 });
 it('does not silently allocate incomplete development data',()=>{
  const dev:OptionalAllocations={...config,dimensions:[{...config.dimensions[0],appliesTo:{metrics:['it_hours'],activities:['development']}}]};
  const result=analyzeOptionalAllocation(data,gaps,dev,'d',{year:2027});
  expect(result.total).toBe(0);expect(result.visible).toBe(false);expect(result.unknownCount).toBeGreaterThan(0);
 });
});
