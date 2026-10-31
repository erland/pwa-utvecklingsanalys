import {describe,it,expect} from 'vitest';
import {approvedLoRows} from './BuiltInAllocations';
import {previewActivityAllocation,approveActivityAllocation,type ActivityAllocationRule} from '../domain/activityAllocation';
import type {AnalysisRecord,CanonicalDataset} from '../domain/canonical';
import type {GapState} from '../gaps/store';
const rule:ActivityAllocationRule={id:'rule',datasetId:'source',uoId:'uo:Test',metric:'it_hours',year:2027,reason:'Budget'};
const source=(id:string,value:number,activity:'unknown'|'development'|'maintenance',loId?:string):AnalysisRecord=>({
 id,metric:'it_hours',year:2027,value,activity,scope:{axis:'work',uoId:'uo:Test',...(loId?{loId}:{})},
 authority:'original',approval:'reported',granularity:loId?'total':'activity-part',
 workloadId:loId?'source|'+loId:'matrix',source:{datasetId:'source',sheet:'Budget',cell:id}
});
const data:CanonicalDataset={schemaVersion:2,records:[source('D1',60,'development'),source('E1',40,'maintenance'),source('A1',40,'unknown','lo:A'),source('A2',60,'unknown','lo:B')]};
describe('DEV-177 approved LO read model',()=>{
 it('shows only valid, approved derived parts with metric and source',()=>{
  const decision=approveActivityAllocation(previewActivityAllocation(data,rule),'Reviewed');
  const gaps:GapState={requirements:[],resolutions:[],activityAllocationRules:[rule],activityAllocationDecisions:[decision]};
  const rows=approvedLoRows(data,gaps,2027);
  expect(rows).toHaveLength(2);
  expect(rows.map(r=>r.development)).toEqual([24,36]);
  expect(rows.every(r=>r.metric==='it_hours'&&r.source==='source')).toBe(true);
  expect(approvedLoRows(data,gaps,2028)).toEqual([]);
  const changed:CanonicalDataset={...data,records:data.records.map(r=>r.id==='A1'?{...r,value:41}:r)};
  expect(approvedLoRows(changed,gaps,2027)).toEqual([]);
 });
 it('ignores missing approvals instead of presenting drafts as approved',()=>{
  expect(approvedLoRows(data,{requirements:[],resolutions:[],activityAllocationRules:[rule]},0)).toEqual([]);
 });
});
