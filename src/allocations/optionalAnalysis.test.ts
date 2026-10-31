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
 it('respects selected metric and hides dimensions without overlapping metrics',()=>{
  const chosen=analyzeOptionalAllocation(data,gaps,config,'d',{year:2027,metrics:['it_hours']});
  expect(chosen.total).toBe(350);
  const ignored=analyzeOptionalAllocation(data,gaps,config,'d',{year:2027,metrics:['business_hours']});
  expect(ignored).toMatchObject({total:0,allocated:0,visible:false});
 });
 it('does not show development-only dimensions when maintenance is selected',()=>{
  const onlyDevelopment:OptionalAllocations={...config,dimensions:[{...config.dimensions[0],appliesTo:{metrics:['it_hours'],activities:['development']}}]};
  expect(analyzeOptionalAllocation(data,gaps,onlyDevelopment,'d',{activity:'maintenance'}).visible).toBe(false);
 });
 it('does not show dimensions without applicable allocation rules',()=>{
  const empty={...config,rules:[]};
  const result=analyzeOptionalAllocation(data,gaps,empty,'d');
  expect(result).toMatchObject({visible:false,allocated:0,unallocated:390,total:390});
 });
 it('shows only selected LO or UO overhead with inherited and overridden percentages',()=>{
  const lo=analyzeOptionalAllocation(data,gaps,config,'d',{year:2027,uoIds:['uo'],partId:'a'});
  expect(lo).toMatchObject({visible:true,total:100,allocated:100,unallocated:0});
  expect(lo.amounts).toEqual({direct:90,enable:10});
  const overhead=analyzeOptionalAllocation(data,gaps,config,'d',{year:2027,uoIds:['uo'],partId:'uo-overhead:uo'});
  expect(overhead).toMatchObject({visible:true,total:50,allocated:45,unallocated:5});
  expect(overhead.amounts).toEqual({direct:30,enable:15});
  const absent=analyzeOptionalAllocation(data,gaps,config,'d',{year:2027,uoIds:['uo'],partId:'missing'});
  expect(absent).toMatchObject({visible:false,total:0,allocated:0});
 });
 it('excludes other UOs even when LO identities are the same',()=>{
  const second:CanonicalDataset={...data,records:[...data.records,{...record('other-uo-a',2027,300,'a','lo'),scope:{axis:'work',uoId:'another',loId:'a'}}]};
  expect(analyzeOptionalAllocation(second,gaps,config,'d',{year:2027,uoIds:['uo'],partId:'a'}).total).toBe(100);
  expect(analyzeOptionalAllocation(second,gaps,config,'d',{year:2027,uoIds:['another'],partId:'a'}).total).toBe(300);
  expect(analyzeOptionalAllocation(second,gaps,config,'d',{year:2027,uoIds:['another'],partId:'a'}).visible).toBe(false);
 });
 it('prioriterar UO-årsregel över LO-grundregel men inte över LO-årsregel',()=>{
  const before:OptionalAllocations={...config,rules:[
   {dimensionId:'d',year:0,scope:{kind:'uo',uoId:'uo'},percentages:{direct:100,enable:0}},
   {dimensionId:'d',year:0,scope:{kind:'lo',uoId:'uo',loId:'a'},percentages:{direct:20,enable:80}},
   {dimensionId:'d',year:2027,scope:{kind:'uo',uoId:'uo'},percentages:{direct:60,enable:40}},
   {dimensionId:'d',year:2027,scope:{kind:'lo',uoId:'uo',loId:'b'},percentages:{direct:90,enable:10}}
  ]};
  expect(effectiveOptionalRule(before,'d',2027,{kind:'lo',uoId:'uo',loId:'a'}).rule?.percentages.direct).toBe(60);
  expect(effectiveOptionalRule(before,'d',2027,{kind:'lo',uoId:'uo',loId:'b'}).rule?.percentages.direct).toBe(90);
  expect(effectiveOptionalRule(before,'d',2028,{kind:'lo',uoId:'uo',loId:'a'}).rule?.percentages.direct).toBe(20);
  const withoutYear={...before,rules:before.rules.filter(r=>!(r.year===2027&&r.scope.kind==='uo'))};
  expect(effectiveOptionalRule(withoutYear,'d',2027,{kind:'lo',uoId:'uo',loId:'a'}).rule?.percentages.direct).toBe(20);
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
