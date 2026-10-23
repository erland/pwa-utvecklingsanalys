import {describe,it,expect} from 'vitest';
import {compareTrend} from './canonicalComparison';
import type {TrendPoint} from './canonicalTrend';
const point=(year:number,value:number,metric:'it_hours'|'business_hours'='it_hours',unknownCount=0):TrendPoint=>({year,value,metric,unit:'h',unknownCount,staleApprovals:0});
describe('canonical year comparison',()=>{
 it('computes actual difference and relative change within a metric',()=>{
  expect(compareTrend([point(2027,700),point(2028,500)])).toMatchObject([{fromYear:2027,toYear:2028,difference:-200,percent:-200/700*100}]);
 });
 it('does not make up missing years or conflate separate measures',()=>{
  expect(compareTrend([point(2027,700),point(2029,500),point(2028,100,'business_hours')])).toEqual([]);
 });
 it('avoids division by zero and flags incomplete activity coverage',()=>{
  expect(compareTrend([point(2027,0),point(2028,120,'it_hours',1)])[0]).toMatchObject({difference:120,percent:null,incomplete:true});
 });
});
