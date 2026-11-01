import {describe,it,expect} from 'vitest';
import {builtInRows} from './BuiltInAllocations';
import type {AnalysisRecord,CanonicalDataset} from '../domain/canonical';
const record=(id:string,metric:'it_hours'|'business_hours',value:number,year=2027,activity:'unknown'|'development'|'maintenance'='unknown',loId?:string):AnalysisRecord=>({
 id,metric,value,year,activity,scope:{axis:'work',uoId:'uo:Test',...(loId?{loId}:{})},authority:'original',approval:'reported',
 workloadId:id,granularity:activity==='unknown'?'total':'activity-part',
 ...(activity!=='unknown'?{workPart:'uo-activity-matrix' as const}:{}),
 source:{datasetId:'source',sheet:'Budget',cell:id}
});
describe('DEV-175 inbyggda läsmodeller',()=>{
 it('separates IT and verksamhet and never adds activity matrix to the metric total',()=>{
  const data:CanonicalDataset={schemaVersion:2,records:[record('a','it_hours',60),record('b','business_hours',40),record('c','it_hours',30,2027,'development'),record('d','it_hours',30,2027,'maintenance')]};
  expect(builtInRows(data,'metric',2027)[0].values).toEqual({first:60,second:40});
  expect(builtInRows(data,'activity',2027)[0].values).toEqual({first:30,second:30});
 });
 it('never adds million-krona costs to imported hour distributions',()=>{
  const cost=(activity:'development'|'maintenance',value:number):AnalysisRecord=>({...record('cost-'+activity,'it_hours',value,2027,activity),metric:'other_cost',id:'cost-'+activity});
  const data:CanonicalDataset={schemaVersion:2,records:[
   record('it-dev','it_hours',30,2027,'development'),
   record('it-maint','it_hours',10,2027,'maintenance'),
   record('business-dev','business_hours',20,2027,'development'),
   record('business-maint','business_hours',40,2027,'maintenance'),
   cost('development',70000000),cost('maintenance',30000000)
  ]};
  expect(builtInRows(data,'activity',2027)[0].values).toEqual({first:50,second:50});
  expect(builtInRows(data,'activity-cost',2027)[0].values).toEqual({first:70000000,second:30000000});
  expect(builtInRows(data,'activity-cost',2028)).toEqual([]);
 });
 it('does not show incomplete UO activity matrices as complete',()=>{
  const data:CanonicalDataset={schemaVersion:2,records:[record('a','it_hours',20,2027,'development')]};
  expect(builtInRows(data,'activity',2027)).toEqual([]);
 });
 it('filters years and excludes non-original values',()=>{
  const manual={...record('m','it_hours',999),authority:'derived' as const,approval:'approved' as const};
  const data:CanonicalDataset={schemaVersion:2,records:[record('a','it_hours',10,2027),record('b','it_hours',20,2028),manual]};
  expect(builtInRows(data,'metric',2027)[0].values.first).toBe(10);
  expect(builtInRows(data,'metric',0)[0].values.first).toBe(30);
 });
});
