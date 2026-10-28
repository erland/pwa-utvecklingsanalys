import {describe,it,expect} from 'vitest';
import {emptyCanonical,type AnalysisRecord} from '../domain/canonical';
import {analyzeCanonical} from './canonicalQuery';
import {canonicalGroupYears} from './canonicalGroupYears';
import type {GapState} from '../gaps/store';

const state:GapState={requirements:[],resolutions:[]};
const record=(id:string,value:number,year:number,loId?:string,part?:AnalysisRecord['workPart']):AnalysisRecord=>({
 id,metric:'it_hours',value,year,activity:'unknown',
 scope:{axis:'work',uoId:'uo:Example',...(loId?{loId}:{})},
 authority:'original',approval:'reported',granularity:'total',workPart:part,
 workloadId:'ds|'+(loId??'overhead')+'|'+year,
 source:{datasetId:'ds',sheet:'UO',cell:id}
});
describe('advanced UO detail reporting',()=>{
 it('lists LO plus UO overhead in selected UO for every year, without adding matrix',()=>{
  const d=emptyCanonical();
  d.records=[
   record('D26',100,2027,'lo:Example:One','lo'),
   record('D32',80,2027,'lo:Example:Two','lo'),
   record('D20',15,2027,undefined,'uo-overhead'),
   record('G26',110,2028,'lo:Example:One','lo'),
   record('G32',90,2028,'lo:Example:Two','lo'),
   record('G20',20,2028,undefined,'uo-overhead'),
   {...record('D5',999,2027),activity:'development',granularity:'activity-part',workPart:'uo-activity-matrix',workloadId:'matrix|2027'},
   {...record('E5',999,2027),activity:'maintenance',granularity:'activity-part',workPart:'uo-activity-matrix',workloadId:'matrix|2027'}
  ];
  const q={axis:'work' as const,metrics:['it_hours' as const],activity:'all' as const,detailUoId:'uo:Example'};
  const result=analyzeCanonical(d,state,{...q,year:2027});
  expect(result.total).toBe(195);
  expect(result.rows.map(r=>r.label).sort()).toEqual(['One','Two','UO Övergripande']);
  const years=canonicalGroupYears(d,state,q);
  expect(years.years).toEqual([2027,2028]);
  expect(years.total).toBe(415);
  expect(years.rows.map(r=>r.label).sort()).toEqual(['One','Two','UO Övergripande']);
  expect(years.rows.find(r=>r.label==='UO Övergripande')?.values).toEqual([15,20]);
 });
});
