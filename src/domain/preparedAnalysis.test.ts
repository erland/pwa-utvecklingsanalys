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
});
describe('prepared annual analysis boundary',()=>{
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
