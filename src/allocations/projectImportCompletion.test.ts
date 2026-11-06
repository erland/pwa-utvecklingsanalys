import {describe,it,expect} from 'vitest';
import {emptyCanonical,type CanonicalDataset,type AnalysisRecord} from '../domain/canonical';
import {projectCompletionRows,saveProjectImportCompletion,effectiveProjectActivitySplits} from './projectActivityAllocation';
import {prepareAnalysisDataset} from '../domain/preparedAnalysis';
import {analyzeCanonical} from '../analytics/canonicalQuery';

const dataset=():CanonicalDataset=>{
 const make=(part:string,value:number,metric:'it_hours'|'other_cost'='it_hours'):AnalysisRecord=>({
  id:part+metric,metric,value,year:2027,activity:'unknown',scope:{axis:'project',projectId:'project:X',partId:'project-part:X:'+part},
  authority:'original',approval:'reported',granularity:'total',workloadId:part+'-'+metric+'-2027',
  source:{datasetId:'source',sheet:'Budget',cell:part==='A'?'D26':'D32'},
  ...(metric==='it_hours'?{projectMatrixDevelopment:50,projectMatrixMaintenance:0,projectMatrixMaintenanceAssumed:true,projectDefaultDevelopmentPercent:100}:{})
 });
 return {...emptyCanonical(),records:[make('A',40),make('B',60),make('A',100,'other_cost')]};
};
describe('project import completion parity',()=>{
 it('recomputes all unmodified parts while keeping manual decisions',()=>{
  const data=dataset(),row=projectCompletionRows(data).find(r=>r.metric==='it_hours')!;
  const completions=saveProjectImportCompletion(data,[],{projectId:row.projectId,year:row.year,metric:row.metric,development:50,maintenance:50});
  const state={requirements:[],resolutions:[],projectImportCompletions:completions};
  expect(effectiveProjectActivitySplits(data,[],completions).filter(r=>r.developmentPercent===50)).toHaveLength(2);
  const prepared=prepareAnalysisDataset(data,state).dataset;
  expect(analyzeCanonical(prepared,state,{axis:'project',metrics:['it_hours'],activity:'development',year:2027}).total).toBe(50);
  const a=data.records[0];
  const manual=[{workloadId:a.workloadId,sourceFingerprint:JSON.stringify([a.id,a.value,a.metric,a.year,null,a.source?.datasetId,a.source?.sheet,a.source?.cell,a.scope]),developmentPercent:25}];
  expect(effectiveProjectActivitySplits(data,manual,completions).find(r=>r.workloadId===a.workloadId)?.developmentPercent).toBe(25);
 });
 it('cannot change source-locked values and rejects stale source fingerprints',()=>{
  const data=dataset(),r=projectCompletionRows(data).find(r=>r.metric==='it_hours')!;
  expect(()=>saveProjectImportCompletion(data,[],{projectId:r.projectId,year:r.year,metric:r.metric,development:40,maintenance:10})).toThrow('IMPORTED_ACTIVITY_MUST_BE_PRESERVED');
  const saved=saveProjectImportCompletion(data,[],{projectId:r.projectId,year:r.year,metric:r.metric,development:50,maintenance:25});
  expect(effectiveProjectActivitySplits({...data,records:data.records.map(x=>({...x,value:x.value+1}))},[],saved).some(x=>x.developmentPercent===100)).toBe(true);
 });
});