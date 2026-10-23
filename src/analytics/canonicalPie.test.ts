import {describe,it,expect} from 'vitest';
import {emptyCanonical,type AnalysisRecord} from '../domain/canonical';
import {analyzeCanonical} from './canonicalQuery';
import {pieEligibility,pieSlices} from './charts';

const row=(id:string,value:number,loId:string):AnalysisRecord=>({
 id,metric:'it_hours',value,year:2027,activity:'unknown',scope:{axis:'work',uoId:'uo',loId},
 authority:'original',approval:'reported',workPart:'lo',granularity:'total',
 workloadId:'ds|uo|'+loId+'|it_hours|2027|year',source:{datasetId:'ds',sheet:'S',cell:id}
});
describe('canonical v2 pie presentation',()=>{
 it('keeps correct slices and original total after source-aware aggregation',()=>{
  const data={...emptyCanonical(),records:[row('D1',300,'lo1'),row('D2',700,'lo2')]};
  const result=analyzeCanonical(data,{requirements:[],resolutions:[]},{axis:'work',metrics:['it_hours'],activity:'all'});
  const projection={...result,rows:result.rows.map(r=>({...r,count:1})),included:result.rows.length,excluded:result.excludedAlternatives};
  expect(pieEligibility(projection)).toBeNull();
  expect(pieSlices(projection).map(s=>s.percentage)).toEqual([30,70]);
  expect(result.total).toBe(1000);
 });
 it('rejects empty and nonpositive canonical results rather than rendering a misleading chart',()=>{
  const projection={unit:'h' as const,total:0,rows:[],included:0,excluded:0};
  expect(pieEligibility(projection)).toMatch(/Inga värden/);
 });
});
