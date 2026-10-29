import {describe,expect,it} from 'vitest';
import {annualTotals} from './annualTotals';
import type {TrendPoint} from './canonicalTrend';
const p=(year:number,metric:'it_hours'|'business_hours',value:number,unknownCount=0):TrendPoint=>({year,metric,value,unit:'h',unknownCount,staleApprovals:0});
describe('DEV-119 unified annual totals',()=>{
 it('adds only selected measures and calculates consecutive annual differences',()=>{
  const rows=annualTotals([p(2027,'it_hours',100),p(2027,'business_hours',50),p(2028,'it_hours',120),p(2028,'business_hours',60)],['it_hours','business_hours']);
  expect(rows.map(x=>[x.year,x.value,x.difference,x.percent])).toEqual([[2027,150,null,null],[2028,180,30,20]]);
  expect(annualTotals([p(2027,'it_hours',100),p(2027,'business_hours',50)],['it_hours'])[0].value).toBe(100);
 });
 it('does not insert absent years or pretend missing measures are zero',()=>{
  const rows=annualTotals([p(2027,'it_hours',100),p(2029,'business_hours',30)],['it_hours','business_hours']);
  expect(rows.map(x=>x.year)).toEqual([2027,2029]);
  expect(rows.map(x=>x.difference)).toEqual([null,null]);
  expect(rows[0].missingMetrics).toEqual(['business_hours']);
  expect(rows[1].missingMetrics).toEqual(['it_hours']);
 });
 it('warns when annual comparisons lack a metric or activity coverage, and avoids division by zero',()=>{
  const rows=annualTotals([p(2027,'it_hours',0),p(2028,'it_hours',120,1)],['it_hours','business_hours']);
  expect(rows[1]).toMatchObject({difference:120,percent:null,incompleteComparison:true});
 });
});
