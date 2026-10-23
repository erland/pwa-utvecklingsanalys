import {describe,expect,it} from 'vitest';
import {emptyCanonical,type AnalysisRecord} from '../domain/canonical';
import {approveActivityAllocation,previewActivityAllocation} from '../domain/activityAllocation';
import {analyzeCanonical} from './canonicalQuery';
import {canonicalTrend} from './canonicalTrend';
import type {GapState} from '../gaps/store';

const state:GapState={requirements:[],resolutions:[]};
const record=(id:string,value:number,uoId:string,loId:string|undefined,activity:AnalysisRecord['activity'],year=2027,datasetId='ds'):AnalysisRecord=>({
 id,metric:'it_hours',value,year,activity,scope:{axis:'work',uoId,...(loId?{loId}:{})},
 authority:'original',approval:'reported',
 granularity:loId?'total':'activity-part',
 workPart:loId?'lo':'uo-activity-matrix',
 workloadId:[datasetId,uoId,loId??'matrix','it_hours',year].join('|'),
 source:{datasetId,sheet:'S',cell:id}
});
const fixture=()=>{
 const data=emptyCanonical();
 data.records=[
  record('D5',600,'uo:a',undefined,'development'),
  record('E5',400,'uo:a',undefined,'maintenance'),
  record('D26',700,'uo:a','lo:a:1','unknown'),
  record('D32',300,'uo:a','lo:a:2','unknown'),
  record('D40',80,'uo:b','lo:b:1','unknown',2027,'other'),
  record('D28',200,'uo:a','lo:a:1','unknown',2028)
 ];
 return data;
};
const query={axis:'work' as const,metrics:['it_hours' as const],activity:'all' as const};
describe('CHANGE-041 critical v2 migration regression',()=>{
 it('isolates work and department axes and honors intersecting source, UO and LO selection',()=>{
  const d=fixture();
  d.records.push({...record('F2',999,'uo:a','lo:a:1','unknown'),scope:{axis:'department',departmentId:'department:operations'},workloadId:'ds|department|operations|it_hours|2027'});
  expect(analyzeCanonical(d,state,{...query,year:2027}).total).toBe(1080);
  expect(analyzeCanonical(d,state,{...query,year:2027,uoIds:['uo:a'],loIds:['lo:a:1'],datasetIds:['ds']}).total).toBe(700);
  expect(analyzeCanonical(d,state,{...query,year:2027,uoIds:['uo:a'],loIds:['lo:b:1']}).total).toBe(0);
  expect(analyzeCanonical(d,state,{...query,year:2027,axis:'department'}).total).toBe(999);
  expect(analyzeCanonical(d,state,{...query,year:2027,axis:'department',datasetIds:['other']}).total).toBe(0);
 });
 it('maintains development/maintenance partitions only after approval and marks stale decisions',()=>{
  const d=fixture();
  const rule={id:'review',datasetId:'ds',uoId:'uo:a',metric:'it_hours' as const,year:2027,reason:'Avstämt'};
  const approved=approveActivityAllocation(previewActivityAllocation(d,rule),'Godkänt');
  const approvedState:GapState={...state,activityAllocationRules:[rule],activityAllocationDecisions:[approved]};
  expect(analyzeCanonical(d,approvedState,{...query,year:2027,uoIds:['uo:a'],activity:'development'}).total).toBe(600);
  expect(analyzeCanonical(d,approvedState,{...query,year:2027,uoIds:['uo:a'],activity:'maintenance'}).total).toBe(400);
  expect(analyzeCanonical(d,approvedState,{...query,year:2027,uoIds:['uo:a']}).total).toBe(1000);
  const changed=fixture();changed.records[2].value=680;changed.records[3].value=320;
  const stale=analyzeCanonical(changed,approvedState,{...query,year:2027,uoIds:['uo:a'],activity:'development'});
  expect(stale.total).toBe(0);
  expect(stale.staleApprovals).toBe(1);
  expect(stale.unknownCount).toBeGreaterThan(0);
  expect(analyzeCanonical(changed,approvedState,{...query,year:2027,uoIds:['uo:a']}).total).toBe(1000);
 });
 it('preserves source-aware annual data and excludes alternative matrix after LO filtering',()=>{
  const d=fixture();
  const points=canonicalTrend(d,state,{...query,datasetIds:['ds'],uoIds:['uo:a'],loIds:['lo:a:1']});
  expect(points.map(p=>[p.year,p.value])).toEqual([[2027,700],[2028,200]]);
  const out=analyzeCanonical(d,state,{...query,year:2027,datasetIds:['ds'],uoIds:['uo:a']});
  expect(out.total).toBe(1000);
  expect(out.excludedAlternatives).toBe(2);
 });
});
