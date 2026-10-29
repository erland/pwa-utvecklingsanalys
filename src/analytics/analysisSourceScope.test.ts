import {describe,it,expect} from 'vitest';
import {emptyCanonical,type AnalysisRecord} from '../domain/canonical';
import {prepareAnalysisDataset} from '../domain/preparedAnalysis';
import {analyzeCanonical} from './canonicalQuery';
import {canonicalGroupYears} from './canonicalGroupYears';
import {organizationScope} from './organizationContext';
import {scopePreparedAnalysis} from './analysisSourceScope';
import type {GapState} from '../gaps/store';

const state:GapState={requirements:[],resolutions:[]};
const row=(source:string,uo:string,lo:string|undefined,year:number,value:number,metric:AnalysisRecord['metric']='it_hours'):AnalysisRecord=>({
 id:[source,uo,lo??'overhead',year,metric].join('|'),metric,value,year,activity:'unknown',
 scope:{axis:'work',uoId:'uo:'+uo,...(lo?{loId:'lo:'+uo+':'+lo}:{})},
 authority:'original',approval:'reported',granularity:'total',workPart:lo?'lo':'uo-overhead',
 workloadId:[source,uo,lo??'overhead',metric,year,'year'].join('|'),
 source:{datasetId:source,sheet:'UO',cell:uo+year+(lo??'overhead')+metric}
});
const data=()=>prepareAnalysisDataset({...emptyCanonical(),records:[
 row('source-a','A','Shared',2027,40),row('source-a','A','Shared',2028,60),
 row('source-a','A',undefined,2027,10),
 row('source-b','B','Shared',2027,100),row('source-b','B','Shared',2028,120),
 row('source-b','B',undefined,2027,20),
 row('source-b','B','Shared',2027,30,'business_hours'),
 {...row('department','B','Shared',2027,7),scope:{axis:'department' as const,departmentId:'dept:B'},workPart:undefined}
]},state).dataset;
const q={axis:'work' as const,metrics:['it_hours' as const],activity:'all' as const};
describe('DEV-114 shared scope and integration acceptance',()=>{
 it('keeps different UOs and same-named LOs separate without double counting',()=>{
  const scoped=scopePreparedAnalysis(data(),{datasetIds:[],uoIds:[],loIds:[]});
  const ids=organizationScope(scoped,{level:'all-uos'}).uoIds;
  const result=analyzeCanonical(scoped,state,{...q,uoIds:ids,organizationLevel:'uo'});
  expect(result.total).toBe(350);
  expect(result.rows.map(r=>[r.key,r.value])).toEqual([['uo:A',110],['uo:B',240]]);
  const years=canonicalGroupYears(scoped,state,{...q,uoIds:ids,organizationLevel:'uo'});
  expect(years.yearTotals).toEqual([170,180]);
  expect(years.total).toBe(result.total);
 });
 it('applies source filters identically to totals, years and drilldown',()=>{
  const scoped=scopePreparedAnalysis(data(),{datasetIds:['source-a'],uoIds:[],loIds:[]});
  expect(organizationScope(scoped,{level:'all-uos'}).uoIds).toEqual(['uo:A']);
  expect(analyzeCanonical(scoped,state,{...q,organizationLevel:'uo'}).total).toBe(110);
  expect(canonicalGroupYears(scoped,state,{...q,organizationLevel:'uo'}).yearTotals).toEqual([50,60]);
  expect(analyzeCanonical(scoped,state,{...q,detailUoId:'uo:A'}).rows.map(r=>r.label)).toEqual(['Shared','UO Övergripande']);
  expect(analyzeCanonical(scoped,state,{...q,detailUoId:'uo:B'}).total).toBe(0);
 });
 it('applies UO and LO filters while preserving department data on the other axis',()=>{
  const scoped=scopePreparedAnalysis(data(),{datasetIds:[],uoIds:['uo:B'],loIds:['lo:B:Shared']});
  expect(analyzeCanonical(scoped,state,{...q,organizationLevel:'uo'}).total).toBe(220);
  expect(analyzeCanonical(scoped,state,{...q,detailUoId:'uo:B'}).rows.map(r=>r.label)).toEqual(['Shared']);
  expect(analyzeCanonical(scoped,state,{...q,axis:'department'}).total).toBe(7);
  expect(analyzeCanonical(scoped,state,{...q,metrics:['business_hours']}).total).toBe(30);
 });
 it('keeps incomplete activity allocations separate from maintenance and never counts them twice',()=>{
  const scoped=scopePreparedAnalysis(data(),{datasetIds:['source-a'],uoIds:[],loIds:[]});
  expect(analyzeCanonical(scoped,state,{...q,activity:'all'}).total).toBe(110);
  expect(analyzeCanonical(scoped,state,{...q,activity:'development'}).total).toBe(0);
  expect(analyzeCanonical(scoped,state,{...q,activity:'maintenance'}).total).toBe(0);
  expect(analyzeCanonical(scoped,state,{...q,activity:'development'}).unknownCount).toBeGreaterThan(0);
 });
});
