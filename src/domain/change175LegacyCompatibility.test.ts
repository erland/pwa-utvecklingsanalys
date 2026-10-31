import {describe,it,expect} from 'vitest';
import {emptyCanonical,type AnalysisRecord,type CanonicalDataset} from './canonical';
import {approveActivityAllocation,approveSharedActivityAllocation,approvedActivityParts,previewActivityAllocation,type ActivityAllocationRule} from './activityAllocation';

const rule:ActivityAllocationRule={id:'legacy-rule',datasetId:'ds',uoId:'uo',metric:'it_hours',year:2027,reason:'Imported UO matrix'};
function row(id:string,loId:string|undefined,value:number,activity:AnalysisRecord['activity']):AnalysisRecord{
 return {id,metric:'it_hours',year:2027,value,activity,scope:{axis:'work',uoId:'uo',...(loId?{loId}:{})},
 authority:'original',approval:'reported',granularity:loId?'total':'activity-part',workloadId:loId?'work-'+loId:'matrix',
 source:{datasetId:'ds',sheet:'Budget',cell:id}};
}
function fixture():CanonicalDataset{return {...emptyCanonical(),records:[
 row('dev',undefined,50,'development'),row('maint',undefined,50,'maintenance'),
 row('lo1', 'lo1',60,'unknown'),row('lo2','lo2',40,'unknown')
]};}
describe('DEV-191 legacy approval compatibility and source locks',()=>{
 it('reads a persisted sharedPercentages approval with its historical non-balanced semantics',()=>{
  const data=fixture(),preview=previewActivityAllocation(data,rule);
  const legacy=JSON.parse(JSON.stringify(approveSharedActivityAllocation(preview,'Older approval',[
   {loId:'lo1',developmentPercent:60},{loId:'lo2',developmentPercent:50}
  ])));
  const before=JSON.stringify(data);
  const result=approvedActivityParts(data,rule,legacy);
  expect(result.filter(r=>r.activity==='development').map(r=>r.value)).toEqual([36,20]);
  expect(result.filter(r=>r.activity==='maintenance').map(r=>r.value)).toEqual([24,20]);
  expect(legacy.sharedPercentages).toBe(true);
  expect(JSON.stringify(data)).toBe(before);
 });
 it('reapproval with balanced semantics preserves UO totals and clears legacy flag',()=>{
  const data=fixture(),preview=previewActivityAllocation(data,rule);
  const previous=approveSharedActivityAllocation(preview,'Old',[{loId:'lo1',developmentPercent:60}]);
  const replacement=approveActivityAllocation(preview,'Reviewed',[{loId:'lo1',developmentPercent:60}]);
  expect(previous.sharedPercentages).toBe(true);
  expect(replacement.sharedPercentages).toBeUndefined();
  expect(approvedActivityParts(data,rule,replacement).filter(r=>r.activity==='development').map(r=>r.value)).toEqual([36,14]);
 });
 it('reimporting a locked LO invalidates legacy approvals and forbids manual overrides of that original',()=>{
  const data=fixture(),preview=previewActivityAllocation(data,rule);
  const legacy=approveSharedActivityAllocation(preview,'Old',[{loId:'lo1',developmentPercent:60}]);
  const imported=fixture();
  imported.records.push({...row('lock-dev','lo1',20,'development'),granularity:'activity-part'});
  imported.records.push({...row('lock-maint','lo1',40,'maintenance'),granularity:'activity-part'});
  expect(approvedActivityParts(imported,rule,legacy)).toEqual([]);
  const newPreview=previewActivityAllocation(imported,rule);
  expect(newPreview.lockedLo).toEqual([{loId:'lo1',development:20,maintenance:40}]);
  expect(()=>approveActivityAllocation(newPreview,'New',[{loId:'lo1',developmentPercent:60}])).toThrow('LOCKED_LO_OVERRIDE');
  const approved=approveActivityAllocation(newPreview,'New');
  const derived=approvedActivityParts(imported,rule,approved);
  expect(derived).toHaveLength(2);
  expect(derived.every(r=>r.scope.axis==='work'&&r.scope.loId==='lo2')).toBe(true);
  expect(derived.filter(r=>r.activity==='development')[0].value).toBe(30);
 });
 it('rejects wrong rule, tampered approvals and changed source fingerprints without resurrecting values',()=>{
  const data=fixture(),preview=previewActivityAllocation(data,rule);
  const decision=approveSharedActivityAllocation(preview,'Old',[{loId:'lo1',developmentPercent:60}]);
  expect(approvedActivityParts(data,rule,{...decision,ruleId:'other'})).toEqual([]);
  expect(approvedActivityParts(data,rule,{...decision,overrides:[{loId:'not-found',developmentPercent:60}]})).toEqual([]);
  const changed=fixture();changed.records[2].value=50;changed.records[3].value=50;
  expect(approvedActivityParts(changed,rule,decision)).toEqual([]);
 });
});
