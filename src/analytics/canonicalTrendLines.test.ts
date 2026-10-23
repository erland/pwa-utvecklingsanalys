import {describe,it,expect} from 'vitest';
import {trendSegments} from './canonicalTrendLines';
import type {TrendPoint} from './canonicalTrend';
const p=(year:number,value:number,metric:TrendPoint['metric']='it_hours'):TrendPoint=>({year,value,metric,unit:'h',unknownCount:0,staleApprovals:0});
describe('v2 trend lines',()=>{
 it('connects consecutive years within each measure and ignores input order',()=>{
  const segments=trendSegments([p(2029,70),p(2027,100),p(2028,80),p(2027,40,'business_hours'),p(2028,60,'business_hours')]);
  expect(segments.map(s=>[s.metric,s.from.year,s.to.year])).toEqual([['it_hours',2027,2028],['it_hours',2028,2029],['business_hours',2027,2028]]);
 });
 it('never draws over gaps or interpolates nonexistent years',()=>{
  expect(trendSegments([p(2027,100),p(2029,150)])).toEqual([]);
 });
});
