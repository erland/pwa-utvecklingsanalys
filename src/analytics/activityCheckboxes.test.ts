import {describe,it,expect} from 'vitest';
import {emptyCanonical,type AnalysisRecord} from '../domain/canonical';
import {analyzeCanonical} from './canonicalQuery';
import type {GapState} from '../gaps/store';
const state:GapState={requirements:[],resolutions:[]};
const rows:AnalysisRecord[]=[
 {id:'total',metric:'it_hours',value:100,year:2027,activity:'unknown',scope:{axis:'work',uoId:'uo:A',loId:'lo:A:1'},authority:'original',approval:'reported',granularity:'total',workloadId:'ds|a',source:{datasetId:'ds',sheet:'s',cell:'D1'}},
 ...(['development','maintenance'] as const).map((activity,i)=>({id:activity,metric:'it_hours' as const,value:i===0?60:40,year:2027,activity,scope:{axis:'work' as const,uoId:'uo:A',loId:'lo:A:1'},authority:'derived' as const,approval:'approved' as const,granularity:'activity-part' as const,workloadId:'ds|a'})),
 {id:'unallocated',metric:'business_hours',value:35,year:2027,activity:'unknown',scope:{axis:'work',uoId:'uo:A',loId:'lo:A:1'},authority:'original',approval:'reported',granularity:'total',workloadId:'ds|b',source:{datasetId:'ds',sheet:'s',cell:'E1'}}
];
const dataset={...emptyCanonical(),records:rows,preparedAnalysis:{staleApprovals:0,excludedMatrix:0}};
describe('DEV-110 activity filters',()=>{
 const query={axis:'work' as const,year:2027,metrics:['it_hours' as const,'business_hours' as const]};
 it('both activities include only approved development and maintenance, not unallocated',()=>{
  expect(analyzeCanonical(dataset,state,{...query,activity:'allocated'}).total).toBe(100);
  expect(analyzeCanonical(dataset,state,{...query,activity:'all'}).total).toBe(135);
 });
 it('independent hour and activity selection works',()=>{
  expect(analyzeCanonical(dataset,state,{...query,metrics:['it_hours'],activity:'development'}).total).toBe(60);
  expect(analyzeCanonical(dataset,state,{...query,metrics:['it_hours'],activity:'maintenance'}).total).toBe(40);
  expect(analyzeCanonical(dataset,state,{...query,metrics:['business_hours'],activity:'allocated'}).total).toBe(0);
 });
});
