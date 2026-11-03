import {describe,it,expect} from 'vitest';
import {emptyCanonical,type AnalysisRecord} from './canonical';
import {previewActivityAllocation,approveSharedActivityAllocation} from './activityAllocation';
import {prepareAnalysisDataset} from './preparedAnalysis';
import {analyzeCanonical} from '../analytics/canonicalQuery';
import type {GapState} from '../gaps/store';

const make=(id:string,value:number,activity:AnalysisRecord['activity'],loId?:string):AnalysisRecord=>({
 id,value,metric:'it_hours',year:2027,activity,
 scope:{axis:'work',uoId:'uo:A',...(loId?{loId}:{})},
 workPart:loId?'lo':'uo-activity-matrix',
 authority:'original',approval:'reported',granularity:loId?'total':'activity-part',
 workloadId:loId?'ds|uo:A|'+loId+'|it_hours|2027|year':'ds|uo:A|it_hours|2027',
 source:{datasetId:'ds',sheet:'Budget',cell:id}
 it('reports auto allocation failures with source scope but keeps unallocated totals unchanged',()=>{
  const source=emptyCanonical();
  source.records=[make('D5',80,'development'),make('D26',70,'unknown','lo:one')];
  const result=prepareAnalysisDataset(source,{requirements:[],resolutions:[]});
  expect(result.diagnostics).toEqual([{
   code:'AUTO_ALLOCATION_FAILED',datasetId:'ds',uoId:'uo:A',year:2027,metric:'it_hours',reason:'INCOMPLETE_UO_OR_LO'
  }]);
  expect(result.dataset.preparedAnalysis.diagnostics).toEqual(result.diagnostics);
  expect(result.dataset.records.filter(r=>r.authority==='derived')).toHaveLength(0);
  expect(analyzeCanonical(result.dataset,{requirements:[],resolutions:[]},{axis:'work',metrics:['it_hours'],activity:'all'}).total).toBe(70);
 });
 it('reports a stale approved allocation without treating it as an automatic replacement',()=>{
  const source=emptyCanonical();
  source.records=[make('D5',60,'development'),make('E5',40,'maintenance'),make('D26',100,'unknown','lo:one')];
  const rule={id:'review',datasetId:'ds',uoId:'uo:A',metric:'it_hours' as const,year:2027,reason:'Reviewed'};
  const approved=approveSharedActivityAllocation(previewActivityAllocation(source,rule),'Reviewed',[]);
  const changed={...source,records:source.records.map(r=>r.id==='D26'?{...r,value:110}:r)};
  const result=prepareAnalysisDataset(changed,{requirements:[],resolutions:[],activityAllocationRules:[rule],activityAllocationDecisions:[approved]});
  expect(result.staleApprovals).toBe(1);
  expect(result.diagnostics).toEqual([{code:'STALE_OR_INVALID_APPROVAL',datasetId:'ds',uoId:'uo:A',year:2027,metric:'it_hours',reason:'Approval fingerprint or allocation is no longer valid'}]);
  expect(result.dataset.records.filter(r=>r.authority==='derived')).toHaveLength(0);
 });

});
describe('prepared annual analysis boundary',()=>{
 it('automatically distributes IT hours before any approval and preserves source',()=>{
  const source=emptyCanonical();
  source.records=[make('D5',80,'development'),make('E5',20,'maintenance'),
   make('D26',70,'unknown','lo:one'),make('D32',30,'unknown','lo:two')];
  const before=JSON.stringify(source);
  const result=prepareAnalysisDataset(source,{requirements:[],resolutions:[]});
  const computed=result.dataset.records.filter(r=>r.authority==='derived');
  expect(computed).toHaveLength(4);
  expect(computed.filter(r=>r.activity==='development').reduce((n,r)=>n+r.value,0)).toBeCloseTo(80);
  expect(computed.filter(r=>r.activity==='maintenance').reduce((n,r)=>n+r.value,0)).toBeCloseTo(20);
  expect(JSON.stringify(source)).toBe(before);
 });
 it('keeps distinct IT and business percentages and splits costs by category without duplicating kroner',()=>{
  const source=emptyCanonical();
  const makeMetric=(id:string,value:number,activity:AnalysisRecord['activity'],metric:AnalysisRecord['metric'],loId?:string):AnalysisRecord=>({
   ...make(id,value,activity,loId),metric,workloadId:'ds|uo:A|'+(loId??'root')+'|'+metric+'|2027'
  });
  source.records=[
   makeMetric('it-dev',80,'development','it_hours'),makeMetric('it-maint',20,'maintenance','it_hours'),
   makeMetric('business-dev',30,'development','business_hours'),makeMetric('business-maint',70,'maintenance','business_hours'),
   makeMetric('cost-dev',600,'development','other_cost'),makeMetric('cost-maint',400,'maintenance','other_cost'),
   makeMetric('it-lo1',50,'unknown','it_hours','lo:one'),makeMetric('it-lo2',50,'unknown','it_hours','lo:two'),
   makeMetric('business-lo1',50,'unknown','business_hours','lo:one'),makeMetric('business-lo2',50,'unknown','business_hours','lo:two'),
   makeMetric('cost-lo1',100,'unknown','other_cost','lo:one'),makeMetric('consultant-lo1',300,'unknown','consultant_cost','lo:one'),
   makeMetric('cost-lo2',200,'unknown','other_cost','lo:two'),makeMetric('consultant-lo2',400,'unknown','consultant_cost','lo:two')
  ];
  const prepared=prepareAnalysisDataset(source,{requirements:[],resolutions:[]});
  const derived=prepared.dataset.records.filter(r=>r.authority==='derived');
  const dev=(metric:AnalysisRecord['metric'])=>derived.filter(r=>r.metric===metric&&r.activity==='development').reduce((n,r)=>n+r.value,0);
  expect(dev('it_hours')).toBeCloseTo(80);
  expect(dev('business_hours')).toBeCloseTo(30);
  expect(dev('other_cost')).toBeCloseTo(180);
  expect(dev('consultant_cost')).toBeCloseTo(420);
  expect(derived.filter(r=>r.metric.endsWith('_cost')).reduce((n,r)=>n+r.value,0)).toBeCloseTo(1000);
 });
 it('materializes approved development and maintenance once without mutating source',()=>{
  const source=emptyCanonical();
  source.records=[make('D5',60,'development'),make('E5',40,'maintenance'),
   make('D26',70,'unknown','lo:one'),make('D32',30,'unknown','lo:two')];
  const rule={id:'r',datasetId:'ds',uoId:'uo:A',metric:'it_hours' as const,year:2027,reason:'Review'};
  const preview=previewActivityAllocation(source,rule);
  const decision=approveSharedActivityAllocation(preview,'Approved',[
   {loId:'lo:one',developmentPercent:20},{loId:'lo:two',developmentPercent:80}
  ]);
  const state:GapState={requirements:[],resolutions:[],activityAllocationRules:[rule],activityAllocationDecisions:[decision]};
  const before=JSON.stringify(source);
  const prepared=prepareAnalysisDataset(source,state);
  expect(prepared.dataset.records.filter(r=>r.workPart==='uo-activity-matrix')).toHaveLength(0);
  expect(prepared.dataset.records.filter(r=>r.granularity==='activity-part')).toHaveLength(4);
  expect(prepared.dataset.records.some(r=>r.month!==undefined)).toBe(false);
  const query={axis:'work' as const,metrics:['it_hours' as const],year:2027,detailUoId:'uo:A'};
  expect(analyzeCanonical(prepared.dataset,{requirements:[],resolutions:[]},{...query,activity:'development'}).total).toBeCloseTo(38);
  expect(analyzeCanonical(prepared.dataset,{requirements:[],resolutions:[]},{...query,activity:'maintenance'}).total).toBeCloseTo(62);
  expect(analyzeCanonical(prepared.dataset,{requirements:[],resolutions:[]},{...query,activity:'all'}).total).toBe(100);
  expect(JSON.stringify(source)).toBe(before);
 });
});
