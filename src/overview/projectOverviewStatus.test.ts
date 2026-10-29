import {describe,it,expect} from 'vitest';
import {emptyCanonical,type AnalysisRecord} from '../domain/canonical';
import {emptyProject,type AnalysisProject} from '../model';
import {approveSharedActivityAllocation,previewActivityAllocation,type ActivityAllocationRule} from '../domain/activityAllocation';
import type {GapState} from '../gaps/store';
import {projectOverviewStatus} from './projectOverviewStatus';

const project:AnalysisProject={...emptyProject(),datasets:[{id:'source-1',name:'UO A',planningYear:2027,importedAt:'2026-10-29',source:'excel'}]};
const gaps:GapState={requirements:[],resolutions:[]};
const record=(id:string,activity:AnalysisRecord['activity'],value:number,loId?:string):AnalysisRecord=>({
 id,metric:'it_hours',value,year:2027,activity,scope:{axis:'work',uoId:'uo:A',...(loId?{loId}:{})},
 authority:'original',approval:'reported',workloadId:loId?'work|'+loId:'work|matrix',
 granularity:loId?'total':'activity-part',source:{datasetId:'source-1',sheet:'Budget',cell:id},
 ...(loId?{workPart:'lo' as const}:{workPart:'uo-activity-matrix' as const})
});
const canonical=()=>({...emptyCanonical(),records:[record('D5','development',60),record('E5','maintenance',40),record('D26','unknown',100,'lo:1')]});
const rule:ActivityAllocationRule={id:'approval-1',datasetId:'source-1',uoId:'uo:A',metric:'it_hours',year:2027,reason:'Verifierad'};

describe('DEV-115 overview reflects real local project only',()=>{
 it('shows zero counts without imported data, never demo numbers',()=>{
  expect(projectOverviewStatus(emptyProject(),emptyCanonical(),gaps)).toEqual({sources:0,approved:0,pending:0,uos:0,years:0,hasData:false});
 });
 it('counts eligible pending annual allocations by UO/year, not by metric or matrix row',()=>{
  expect(projectOverviewStatus(project,canonical(),gaps)).toEqual({sources:1,approved:0,pending:1,uos:1,years:1,hasData:true});
 });
 it('counts approved allocation only when a valid saved decision matches the source fingerprint',()=>{
  const data=canonical();
  const decision=approveSharedActivityAllocation(previewActivityAllocation(data,rule),'Godkänd',[{loId:'lo:1',developmentPercent:60}]);
  const approved:GapState={...gaps,activityAllocationRules:[rule],activityAllocationDecisions:[decision]};
  expect(projectOverviewStatus(project,data,approved).approved).toBe(1);
  const changed=canonical();changed.records[2].value=110;
  expect(projectOverviewStatus(project,changed,approved).approved).toBe(0);
  expect(projectOverviewStatus(project,changed,approved).pending).toBe(1);
 });
 it('ignores orphan records from deleted sources and legacy demo source entries',()=>{
  const data=canonical();
  const removed=emptyProject();
  expect(projectOverviewStatus(removed,data,gaps).hasData).toBe(false);
  expect(projectOverviewStatus({...removed,datasets:[{...project.datasets[0],source:'demo'}]},data,gaps).sources).toBe(0);
 });
});
