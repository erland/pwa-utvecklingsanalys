import {describe,it,expect} from 'vitest';
import {emptyCanonical,type AnalysisRecord} from '../domain/canonical';
import {saveManualUoSplit} from '../allocations/manualUoAllocation';
import {analyzeCanonical} from './canonicalQuery';
import type {GapState} from '../gaps/store';

const record=(id:string,metric:'other_cost'|'consultant_cost',value:number):AnalysisRecord=>({
 id:metric+id,metric,year:2027,value,activity:'unknown',scope:{axis:'work',uoId:'uo:A',loId:'lo:A:'+id},
 authority:'original',approval:'reported',workloadId:'work:'+metric+id,granularity:'total',workPart:'lo',
 source:{datasetId:'source',sheet:'Budget',cell:metric+id}
});
describe('manual cost UO distribution',()=>{
 it('splits both cost metrics without counting original totals twice',()=>{
  const data={...emptyCanonical(),records:[record('A','other_cost',60),record('B','other_cost',40),record('A','consultant_cost',20),record('B','consultant_cost',80)]};
  const manualUoSplits=saveManualUoSplit(data,[],{uoId:'uo:A',year:2027,metric:'other_cost',developmentPercent:75});
  const state:GapState={requirements:[],resolutions:[],manualUoSplits};
  const query={axis:'work' as const,metrics:['other_cost' as const,'consultant_cost' as const],year:2027};
  expect(analyzeCanonical(data,state,{...query,activity:'all'}).total).toBe(200);
  expect(analyzeCanonical(data,state,{...query,activity:'development'}).total).toBeCloseTo(150);
  expect(analyzeCanonical(data,state,{...query,activity:'maintenance'}).total).toBeCloseTo(50);
  expect(analyzeCanonical(data,state,{...query,activity:'development',metrics:['consultant_cost']}).total).toBeCloseTo(75);
 });
});
