import {describe,expect,it} from 'vitest';
import {emptyCanonical,type AnalysisRecord} from '../domain/canonical';
import {planningTotals,visiblePlanningRows,visibleProjectParts,resolvePlanningSelection} from './PlanningScopeAnalysis';
import {analyzeCanonical} from './canonicalQuery';
import type {GapState} from '../gaps/store';

const state:GapState={requirements:[],resolutions:[]};
const record=(id:string,metric:AnalysisRecord['metric'],value:number,year:number,scope:AnalysisRecord['scope']):AnalysisRecord=>({
 id,metric,value,year,activity:'unknown',scope,authority:'original',approval:'reported',
 granularity:'total',workloadId:id,source:{datasetId:scope.axis==='project'?'project-source':'uo-source',sheet:'Budget',cell:id}
});
const dataset=()=>({...emptyCanonical(),records:[
 record('uo-hours','it_hours',100,2027,{axis:'work',uoId:'uo:Test',loId:'lo:Test:A'}),
 record('uo-cost','other_cost',1000,2027,{axis:'work',uoId:'uo:Test',loId:'lo:Test:A'}),
 record('project-hours-a','it_hours',30,2027,{axis:'project',projectId:'project:Test',partId:'project-part:Test:A'}),
 record('project-hours-b','it_hours',70,2027,{axis:'project',projectId:'project:Test',partId:'project-part:Test:B'}),
 record('project-cost','other_cost',250,2027,{axis:'project',projectId:'project:Test',partId:'project-part:Test:A'}),
 record('project-next-year','it_hours',40,2028,{axis:'project',projectId:'project:Test',partId:'project-part:Test:A'}),
 record('department-alternative','it_hours',200,2027,{axis:'department',departmentId:'department:A'})
]});
describe('additive planning of UO and independent projects',()=>{
 it('sums UO and project hours while excluding department alternative accounting',()=>{
  const totals=planningTotals(dataset(),state,['it_hours'],2027);
  expect(totals.uo.total).toBe(100);
  expect(totals.projects.total).toBe(100);
  expect(totals.total).toBe(200);
  expect(totals.uo.rows).toEqual([{key:'uo:Test',label:'Test',value:100}]);
  expect(totals.projects.rows).toEqual([{key:'project:Test',label:'Test',value:100}]);
  expect(analyzeCanonical(dataset(),state,{axis:'project',metrics:['it_hours'],activity:'all',year:2027}).rows)
   .toEqual([{key:'project-part:Test:A',label:'A',value:30},{key:'project-part:Test:B',label:'B',value:70}]);
 });
 it('sums cost categories separately and respects year filters',()=>{
  const costs=planningTotals(dataset(),state,['other_cost'],2027);
  expect([costs.uo.total,costs.projects.total,costs.total,costs.unit]).toEqual([1000,250,1250,'SEK']);
  expect(planningTotals(dataset(),state,['it_hours'],2028).total).toBe(40);
  expect(planningTotals(dataset(),state,['it_hours']).total).toBe(240);
 });
 it('keeps unallocated projects visible under development and maintenance while preserving additive totals',()=>{
  const data=dataset();
  const overview=visiblePlanningRows(data,state,['it_hours'],2027,'development','all');
  expect(overview.map(row=>[row.kind,row.key,row.value,row.unallocated])).toEqual([
   ['UO','uo:Test',undefined,100],['Projekt','project:Test',undefined,100]
  ]);
  expect(planningTotals(data,state,['it_hours'],2027,'development').total).toBe(0);
  expect(planningTotals(data,state,['it_hours'],2027).total).toBe(200);
  const parts=visibleProjectParts(data,state,['it_hours'],2027,'maintenance','project:Test');
  expect(parts.map(row=>[row.key,row.value,row.unallocated])).toEqual([
   ['project-part:Test:A',undefined,30],['project-part:Test:B',undefined,70]
  ]);
 });
 it('preserves object navigation for partially allocated projects without treating unknown hours as zero',()=>{
  const data=dataset();
  const total=data.records.find(r=>r.id==='project-hours-a')!;
  const prepared={...data,records:[...data.records,
   {...total,id:'a-dev',activity:'development' as const,value:10,granularity:'activity-part' as const,authority:'derived' as const,approval:'approved' as const,source:undefined},
   {...total,id:'a-maint',activity:'maintenance' as const,value:20,granularity:'activity-part' as const,authority:'derived' as const,approval:'approved' as const,source:undefined}
  ]};
  const overview=visiblePlanningRows(prepared,state,['it_hours'],2027,'development','project');
  expect(overview).toEqual([{key:'project:Test',label:'Test',kind:'Projekt',value:10,unallocated:70}]);
  const parts=visibleProjectParts(prepared,state,['it_hours'],2027,'development','project:Test');
  expect(parts.map(row=>[row.key,row.value,row.unallocated])).toEqual([
   ['project-part:Test:A',10,0],['project-part:Test:B',undefined,70]
  ]);
  expect(planningTotals(prepared,state,['it_hours'],2027).total).toBe(200);
 });
 it('resolves a single detail by type and identity and clears it when current filters exclude it',()=>{
  const data=dataset();
  const rows=visiblePlanningRows(data,state,['it_hours'],2027,'all','all');
  const project={kind:'Projekt' as const,key:'project:Test'};
  const uo={kind:'UO' as const,key:'uo:Test'};
  expect(resolvePlanningSelection(rows,project)).toMatchObject({kind:'Projekt',key:'project:Test',value:100});
  expect(resolvePlanningSelection(rows,uo)).toMatchObject({kind:'UO',key:'uo:Test',value:100});
  expect(resolvePlanningSelection(rows,null)).toBeNull();
  expect(resolvePlanningSelection(visiblePlanningRows(data,state,['it_hours'],2027,'all','uo'),project)).toBeNull();
  expect(resolvePlanningSelection(visiblePlanningRows(data,state,['other_cost'],2028,'all','all'),project)).toBeNull();
  expect(resolvePlanningSelection(rows,{kind:'Projekt',key:'uo:Test'})).toBeNull();
  // A filtered-out detail must not alter the additive budget totals.
  expect(planningTotals(data,state,['it_hours'],2027).total).toBe(200);
 });
 it('does not count unallocated project activity as zero development by mistake',()=>{
  const d=dataset();
  const project=analyzeCanonical(d,state,{axis:'project',metrics:['it_hours'],activity:'development',year:2027});
  expect(project.total).toBe(0);
  expect(project.unknownCount).toBe(2);
 });
});
