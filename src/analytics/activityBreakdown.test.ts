import {describe,it,expect} from 'vitest';
import {emptyCanonical,type AnalysisRecord} from '../domain/canonical';
import {approveActivityAllocation,previewActivityAllocation} from '../domain/activityAllocation';
import type {GapState} from '../gaps/store';
import {uoActivityRows,addActivitySplits} from './activityBreakdown';
const state:GapState={requirements:[],resolutions:[]};
const row=(id:string,value:number,activity:AnalysisRecord['activity'],loId?:string):AnalysisRecord=>({
 id,metric:'it_hours',value,year:2027,activity,
 scope:{axis:'work',uoId:'uo:A',...(loId?{loId}:{})},
 authority:'original',approval:'reported',granularity:loId?'total':'activity-part',
 workloadId:loId?'ds|uo:A|'+loId+'|it_hours|2027|year':'ds|uo:A|it_hours|2027',
 source:{datasetId:'ds',sheet:'S',cell:id}
});
const data=()=>({...emptyCanonical(),records:[
 row('D5',50,'development'),row('E5',50,'maintenance'),
 row('D26',60,'unknown','lo:1'),row('D32',40,'unknown','lo:2'),
 {...row('D20',10,'unknown'),granularity:'total' as const,workPart:'uo-overhead' as const,workloadId:'ds|uo:A|overhead|it_hours|2027|year'}
]});
describe('organization activity distribution',()=>{
 it('marks all original LO and overhead totals as undistributed before approval',()=>{
  const d=data(),rows=uoActivityRows(d,state,['it_hours'],2027,'uo:A');
  expect(rows['lo:1']).toEqual({total:60,development:0,maintenance:0,unallocated:60});
  expect(rows['uo-overhead:uo:A']).toEqual({total:10,development:0,maintenance:0,unallocated:10});
  expect(addActivitySplits(Object.values(rows))).toEqual({total:110,development:0,maintenance:0,unallocated:110});
 });
 it('uses approved adjusted LO activity but never treats overhead as an LO',()=>{
  const d=data(),rule={id:'r',datasetId:'ds',uoId:'uo:A',metric:'it_hours' as const,year:2027,reason:'Reviewed'};
  const decision=approveActivityAllocation(previewActivityAllocation(d,rule),'Approved',[{loId:'lo:1',developmentPercent:60}]);
  const approved={...state,activityAllocationRules:[rule],activityAllocationDecisions:[decision]};
  const before=JSON.stringify(d),rows=uoActivityRows(d,approved,['it_hours'],2027,'uo:A');
  expect(rows['lo:1']).toEqual({total:60,development:36,maintenance:24,unallocated:0});
  expect(rows['lo:2']).toEqual({total:40,development:14,maintenance:26,unallocated:0});
  expect(rows['uo-overhead:uo:A']).toEqual({total:10,development:0,maintenance:0,unallocated:10});
  expect(addActivitySplits(Object.values(rows))).toEqual({total:110,development:50,maintenance:50,unallocated:10});
  expect(JSON.stringify(d)).toBe(before);
 });
 it('reverts to undistributed when approval is stale',()=>{
  const d=data(),rule={id:'r',datasetId:'ds',uoId:'uo:A',metric:'it_hours' as const,year:2027,reason:'Reviewed'};
  const decision=approveActivityAllocation(previewActivityAllocation(d,rule),'Approved');
  d.records.find(x=>x.id==='D26')!.value=61;
  const rows=uoActivityRows(d,{...state,activityAllocationRules:[rule],activityAllocationDecisions:[decision]},['it_hours'],2027,'uo:A');
  expect(rows['lo:1'].unallocated).toBe(61);
  expect(rows['lo:1'].development).toBe(0);
 });
});
