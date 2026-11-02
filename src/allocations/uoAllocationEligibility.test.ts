import {describe,it,expect} from 'vitest';
import {emptyCanonical,type AnalysisRecord} from '../domain/canonical';
import {uoAllocationEligibility} from './uoAllocationEligibility';

const record=(year:number,metric:'it_hours'|'business_hours',activity:'unknown'|'development'|'maintenance',value:number):AnalysisRecord=>({
 id:[year,metric,activity].join(':'),metric,year,value,activity,
 scope:{axis:'work',uoId:'uo:A',loId:'lo:A:L'},authority:'original',approval:'reported',
 workloadId:'sample',granularity:activity==='unknown'?'total':'activity-part',
 ...(activity==='unknown'?{workPart:'lo' as const}:{workPart:'uo-activity-matrix' as const}),
 source:{datasetId:'source',sheet:'UO',cell:activity}
});
describe('UO split editability',()=>{
 it('allows manual entry for missing activity pairs but preserves other year and metric locks',()=>{
  const records=[record(2027,'it_hours','unknown',50),
   record(2027,'it_hours','development',30),record(2027,'it_hours','maintenance',20),
   record(2028,'it_hours','unknown',60),record(2027,'business_hours','unknown',12)];
  const result=uoAllocationEligibility({...emptyCanonical(),records});
  expect(result.find(r=>r.year===2027&&r.metric==='it_hours')).toMatchObject({status:'imported-locked',development:30,maintenance:20});
  expect(result.find(r=>r.year===2028&&r.metric==='it_hours')?.status).toBe('manual-allowed');
  expect(result.find(r=>r.metric==='business_hours')?.status).toBe('manual-allowed');
 });
 it('does not interpret a single imported activity as a complete pair',()=>{
  const result=uoAllocationEligibility({...emptyCanonical(),records:[record(2027,'it_hours','unknown',30),record(2027,'it_hours','development',30)]});
  expect(result).toHaveLength(1);
  expect(result[0].status).toBe('manual-allowed');
  expect(result[0].maintenance).toBeUndefined();
 });
});
