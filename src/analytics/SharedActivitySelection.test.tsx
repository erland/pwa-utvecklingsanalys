import {describe,expect,it} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {emptyCanonical,type AnalysisRecord} from '../domain/canonical';
import type {GapState} from '../gaps/store';
import PlanningScopeAnalysis,{planningTotals} from './PlanningScopeAnalysis';
import {analysisSelectionSummary} from './analysisSelectionSummary';

const state:GapState={requirements:[],resolutions:[]};
const source=(id:string,scope:AnalysisRecord['scope'],metric:AnalysisRecord['metric'],value:number):AnalysisRecord=>({
 id,scope,metric,value,year:2027,workloadId:id,activity:'unknown',granularity:'total',
 authority:'original',approval:'reported',source:{datasetId:id,sheet:'Budget',cell:id}
});
const data=()=>{
 const project=source('P1',{axis:'project',projectId:'project:One',partId:'project-part:One:A'},'it_hours',100);
 const cost=source('P2',{axis:'project',projectId:'project:One',partId:'project-part:One:A'},'other_cost',200);
 const uo=source('U1',{axis:'work',uoId:'uo:Two',loId:'lo:Two:A'},'it_hours',50);
 const split=(record:AnalysisRecord,activity:'development'|'maintenance',value:number):AnalysisRecord=>({
  ...record,id:record.id+'-'+activity,activity,value,granularity:'activity-part',
  approval:'approved',authority:'derived',source:undefined
 });
 return {...emptyCanonical(),records:[
  project,cost,uo,
  split(project,'development',60),split(project,'maintenance',40),
  split(cost,'development',150),split(cost,'maintenance',50),
  split(uo,'development',10),split(uo,'maintenance',40)
 ]};
};
const html=(scope:'all'|'project',metric:AnalysisRecord['metric'],activity:'all'|'development'|'maintenance')=>
 renderToStaticMarkup(createElement(PlanningScopeAnalysis,{data:data(),state,scope,metrics:[metric],year:2027,activity}));
describe('shared activity filter and rendered planning totals',()=>{
 it('uses exactly the parent-selected activity in planning table and aggregate',()=>{
  expect(planningTotals(data(),state,['it_hours'],2027,'development').total).toBe(70);
  const development=html('all','it_hours','development');
  expect(development).toContain('Totalt: <!-- -->70');
  expect(development).toContain('60 h');
  expect(development).toContain('10 h');
  const maintenance=html('all','it_hours','maintenance');
  expect(maintenance).toContain('Totalt: <!-- -->80');
  expect(maintenance).toContain('40 h');
  const total=html('all','it_hours','all');
  expect(total).toContain('Totalt: <!-- -->150');
  expect(total).not.toContain('Aktivitet för projekt och UO');
 });
 it('includes activity name in shared summary for project costs, without cost-specific double filtering',()=>{
  const summary=(activity:'all'|'development'|'maintenance')=>analysisSelectionSummary({
   axis:'work',unit:'costs',metrics:['other_cost'],activity,year:'2027',
   organization:{level:'all-uos'}
  });
  expect(summary('development').activity).toBe('Utveckling');
  expect(summary('maintenance').activity).toBe('Förvaltning');
  expect(summary('all').activity).toBeUndefined();
  expect(html('project','other_cost','development')).toContain('Totalt: <!-- -->150');
  expect(html('project','other_cost','maintenance')).toContain('Totalt: <!-- -->50');
  expect(html('project','other_cost','all')).toContain('Totalt: <!-- -->200');
 });
});
