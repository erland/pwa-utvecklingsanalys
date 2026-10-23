import {describe,it,expect} from 'vitest';
import {emptyCanonical,type AnalysisRecord} from '../domain/canonical';
import {canonicalTrend} from './canonicalTrend';
const row=(id:string,year:number,value:number,loId?:string):AnalysisRecord=>({
 id,metric:'it_hours',value,year,activity:'unknown',scope:{axis:'work',uoId:'uo',...(loId?{loId}:{})},
 authority:'original',approval:'reported',workPart:loId?'lo':'uo-overhead',granularity:'total',
 workloadId:['ds','uo',loId??'overhead','it_hours',year].join('|'),source:{datasetId:'ds',sheet:'S',cell:id}
});
const gaps={requirements:[],resolutions:[]};
describe('canonical trend',()=>{
 it('keeps UO overhead additive and years separate',()=>{
  const data={...emptyCanonical(),records:[row('a',2027,100),row('b',2027,600,'lo1'),row('c',2028,200),row('d',2028,300,'lo1')]};
  const q={axis:'work' as const,metrics:['it_hours' as const],activity:'all' as const};
  expect(canonicalTrend(data,gaps,q).map(p=>[p.year,p.value])).toEqual([[2027,700],[2028,500]]);
  expect(canonicalTrend(data,gaps,{...q,loIds:['lo1']}).map(p=>p.value)).toEqual([600,300]);
  expect(canonicalTrend(data,gaps,{...q,year:2028}).map(p=>p.year)).toEqual([2028]);
 });
 it('does not invent absent measure values as zero',()=>{
  const data={...emptyCanonical(),records:[row('a',2027,100)]};
  expect(canonicalTrend(data,gaps,{axis:'work',metrics:['it_hours','business_hours'],activity:'all'})).toHaveLength(1);
 });
});
