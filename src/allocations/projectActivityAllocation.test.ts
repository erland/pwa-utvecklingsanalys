import {describe,expect,it} from 'vitest';
import {emptyCanonical,validateCanonical,type AnalysisRecord} from '../domain/canonical';
import {prepareAnalysisDataset} from '../domain/preparedAnalysis';
import {analyzeCanonical} from '../analytics/canonicalQuery';
import {planningTotals} from '../analytics/PlanningScopeAnalysis';
import type {GapState} from '../gaps/store';
import {saveProjectActivitySplit,activeProjectActivitySplits,projectAllocationRows} from './projectActivityAllocation';

const state:GapState={requirements:[],resolutions:[]};
function row(id:string,metric:AnalysisRecord['metric'],value:number,year:number,part:string,source='project-source'):AnalysisRecord{
 return {id,metric,value,year,activity:'unknown',scope:{axis:'project',projectId:'project:Digitalisering',partId:'project-part:Digitalisering:'+part},
  authority:'original',approval:'reported',granularity:'total',workloadId:[source,part,metric,year].join('|'),
  source:{datasetId:source,sheet:'Budget',cell:id}};
}
const project=()=>({...emptyCanonical(),records:[
 row('D26','it_hours',100,2027,'Integration'),
 row('D27','business_hours',50,2027,'Integration'),
 row('D28','other_cost',800,2027,'Integration'),
 row('D29','consultant_cost',200,2027,'Integration'),
 row('D32','it_hours',30,2027,'Plattform'),
 row('Q26','it_hours',40,2028,'Integration'),
 { ...row('D50','it_hours',20,2027,'Other'),scope:{axis:'work' as const,uoId:'uo:UO',loId:'lo:UO:A'},workPart:'lo' as const }
]});
describe('independent project development/maintenance allocations',()=>{
 it('splits hours and SEK per project part, metric and year without changing totals',()=>{
  const data=project();
  const first=saveProjectActivitySplit(data,[],{workloadId:data.records[0].workloadId,developmentPercent:60});
  const second=saveProjectActivitySplit(data,first,{workloadId:data.records[2].workloadId,developmentPercent:25});
  const next={...state,projectActivitySplits:second};
  const prepared=prepareAnalysisDataset(data,next).dataset;
  expect(validateCanonical(prepared)).toEqual([]);
  const parts=prepared.records.filter(r=>r.scope.axis==='project'&&r.granularity==='activity-part');
  expect(parts).toHaveLength(4);
  expect(parts.find(r=>r.metric==='it_hours'&&r.activity==='development')?.value).toBe(60);
  expect(parts.find(r=>r.metric==='it_hours'&&r.activity==='maintenance')?.value).toBe(40);
  expect(parts.find(r=>r.metric==='other_cost'&&r.activity==='development')?.value).toBe(200);
  expect(parts.find(r=>r.metric==='other_cost'&&r.activity==='maintenance')?.value).toBe(600);
  expect(analyzeCanonical(prepared,next,{axis:'project',metrics:['it_hours'],activity:'all',year:2027}).total).toBe(130);
  expect(analyzeCanonical(prepared,next,{axis:'project',metrics:['it_hours'],activity:'development',year:2027}).total).toBe(60);
  expect(analyzeCanonical(prepared,next,{axis:'project',metrics:['it_hours'],activity:'maintenance',year:2027}).total).toBe(40);
  expect(analyzeCanonical(prepared,next,{axis:'project',metrics:['it_hours'],activity:'development',year:2027}).unknownCount).toBe(1);
  expect(analyzeCanonical(prepared,next,{axis:'project',metrics:['other_cost'],activity:'development',year:2027}).total).toBe(200);
  expect(analyzeCanonical(prepared,next,{axis:'project',metrics:['consultant_cost'],activity:'development',year:2027}).unknownCount).toBe(1);
  expect(planningTotals(prepared,next,['it_hours'],2027).total).toBe(150);
  expect(planningTotals(prepared,next,['it_hours'],2027,'development').total).toBe(60);
 });
 it('invalidates an edited source without applying stale percentages to changed data',()=>{
  const data=project();
  const decisions=saveProjectActivitySplit(data,[],{workloadId:data.records[0].workloadId,developmentPercent:80});
  const changed={...data,records:data.records.map((r,i)=>i===0?{...r,value:120}:r)};
  expect(activeProjectActivitySplits(changed,decisions)).toEqual([]);
  const prepared=prepareAnalysisDataset(changed,{...state,projectActivitySplits:decisions}).dataset;
  expect(prepared.records.some(r=>r.scope.axis==='project'&&r.granularity==='activity-part')).toBe(false);
  expect(analyzeCanonical(prepared,state,{axis:'project',metrics:['it_hours'],activity:'all',year:2027}).total).toBe(150);
 });
 it('keeps decisions source-scoped and rejects ambiguous, invalid or absent records',()=>{
  const data=project(),target=projectAllocationRows(data)[0];
  const decisions=saveProjectActivitySplit(data,[],{workloadId:target.workloadId,developmentPercent:0});
  expect(saveProjectActivitySplit(data,decisions,{workloadId:target.workloadId,developmentPercent:100})).toHaveLength(1);
  expect(()=>saveProjectActivitySplit(data,decisions,{workloadId:target.workloadId,developmentPercent:101})).toThrow('INVALID_DEVELOPMENT_PERCENT');
  expect(()=>saveProjectActivitySplit(data,decisions,{workloadId:'not-found',developmentPercent:50})).toThrow('PROJECT_WORKLOAD_NOT_FOUND_OR_AMBIGUOUS');
  expect(activeProjectActivitySplits({...data,records:data.records.filter(r=>r.workloadId!==target.workloadId)},decisions)).toEqual([]);
 });
});
