import {describe,it,expect} from 'vitest';
import {emptyCanonical,type AnalysisRecord} from '../domain/canonical';
import {costTypeSummary,costTypeYears} from './costTypeAnalysis';
const make=(metric:'other_cost'|'consultant_cost',year:number,value:number,loId:string):AnalysisRecord=>({
 id:[metric,year,loId].join(':'),metric,value,year,activity:'unknown',
 scope:{axis:'work',uoId:'uo:A',loId},granularity:'total',
 authority:'original',approval:'reported',workloadId:[metric,year,loId].join(':'),
 source:{datasetId:'ds',sheet:'Budget',cell:'D26'}
});
describe('DEV-211 cost types in analysis',()=>{
 it('separates costs, scopes by UO and shows independent annual growth',()=>{
  const data=emptyCanonical();
  data.records=[
   make('other_cost',2027,100,'lo:one'),make('consultant_cost',2027,200,'lo:one'),
   make('other_cost',2028,120,'lo:one'),make('consultant_cost',2028,250,'lo:one'),
   {...make('consultant_cost',2028,1000,'lo:other'),scope:{axis:'work' as const,uoId:'uo:B',loId:'lo:other'}}
  ];
  const state={requirements:[],resolutions:[]};
  const query={axis:'work' as const,metrics:['other_cost' as const,'consultant_cost' as const],activity:'all' as const,uoIds:['uo:A']};
  expect(costTypeSummary(data,state,{...query,year:2027}).map(row=>row.value)).toEqual([200,100]);
  const trend=costTypeYears(data,state,query);
  expect(trend.map(row=>[row.year,row.values,row.total])).toEqual([[2027,[200,100],300],[2028,[250,120],370]]);
 });
});
