import {describe,it,expect} from 'vitest';
import {emptyCanonical,type AnalysisRecord} from '../domain/canonical';
import {previewActivityAllocation,approveActivityAllocation} from '../domain/activityAllocation';
import {analyzeCanonical} from './canonicalQuery';
import type {GapState} from '../gaps/store';

const rule={id:'r',datasetId:'ds',uoId:'uo:A',metric:'it_hours' as const,year:2027,reason:'Review'};
const record=(id:string,value:number,activity:AnalysisRecord['activity'],loId?:string,month?:number):AnalysisRecord=>({
 id,value,metric:'it_hours',year:2027,...(month?{month}:{}),activity,
 scope:{axis:'work',uoId:'uo:A',...(loId?{loId}:{})},
 authority:'original',approval:'reported',granularity:loId?'total':'activity-part',
 workPart:loId?'lo':'uo-activity-matrix',
 workloadId:loId?'ds|uo:A|'+loId+'|it_hours|2027|'+(month??'year'):'ds|uo:A|matrix|2027',
 source:{datasetId:'ds',sheet:'Budget',cell:id}
});
describe('annual projection keeps approved allocation valid',()=>{
 it('uses full original import to verify fingerprint, not annual-only display rows',()=>{
  const data=emptyCanonical();
  data.records=[
   record('D5',60,'development'),record('E5',40,'maintenance'),
   record('P26',70,'unknown','lo:one'),
   record('P32',30,'unknown','lo:two'),
   record('D26',20,'unknown','lo:one',1),
   record('E26',50,'unknown','lo:one',2),
   record('D32',30,'unknown','lo:two',1)
  ];
  const preview=previewActivityAllocation(data,rule);
  const decision=approveActivityAllocation(preview,'Approved');
  const state:GapState={requirements:[],resolutions:[],activityAllocationRules:[rule],activityAllocationDecisions:[decision]};
  const annual={...data,allocationSourceRecords:data.records,records:data.records.filter(r=>r.month===undefined)};
  const q={axis:'work' as const,metrics:['it_hours' as const],year:2027,detailUoId:'uo:A'};
  const noOriginal=analyzeCanonical({...data,records:annual.records},state,{...q,activity:'development'});
  expect(noOriginal.total).toBe(0);
  expect(noOriginal.staleApprovals).toBe(1);
  const development=analyzeCanonical(annual,state,{...q,activity:'development'});
  const maintenance=analyzeCanonical(annual,state,{...q,activity:'maintenance'});
  expect(development.total).toBeCloseTo(60);
  expect(maintenance.total).toBeCloseTo(40);
  expect(development.staleApprovals).toBe(0);
  expect(development.rows.map(r=>r.label).sort()).toEqual(['one','two']);
 });
});
