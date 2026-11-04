import {describe,expect,it} from 'vitest';
import {emptyCanonical,type AnalysisRecord} from '../domain/canonical';
import {planningTotals} from './PlanningScopeAnalysis';
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
 it('does not count unallocated project activity as zero development by mistake',()=>{
  const d=dataset();
  const project=analyzeCanonical(d,state,{axis:'project',metrics:['it_hours'],activity:'development',year:2027});
  expect(project.total).toBe(0);
  expect(project.unknownCount).toBe(2);
 });
});
