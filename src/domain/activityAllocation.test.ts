import {describe,it,expect} from 'vitest';
import {emptyCanonical,summarizeCanonical,type AnalysisRecord} from './canonical';
import {previewActivityAllocation,approveActivityAllocation,approvedActivityParts,type ActivityAllocationRule} from './activityAllocation';
const rule:ActivityAllocationRule={id:'rule1',datasetId:'ds',uoId:'uo',metric:'it_hours',year:2027,reason:'Fördelning utifrån LO-totaler'};
const base=(id:string,value:number,activity:AnalysisRecord['activity'],loId?:string):AnalysisRecord=>({
 id,metric:'it_hours',value,year:2027,activity,scope:{axis:'work',uoId:'uo',...(loId?{loId}:{})},
 authority:'original',approval:'reported',workloadId:loId?'ds|uo|'+loId+'|it_hours|2027|year':'ds|uo|it_hours|2027',
 granularity:loId?'total':'activity-part',source:{datasetId:'ds',sheet:'Budget',cell:id}
});
const fixture=()=>({...emptyCanonical(),records:[base('D5',600,'development'),base('E5',400,'maintenance'),base('D26',700,'unknown','lo1'),base('D32',300,'unknown','lo2')]});
describe('v2 approved activity allocations',()=>{
 it('distributes development/maintenance by LO weights without increasing overall total',()=>{
  const data=fixture(),before=JSON.stringify(data);
  const preview=previewActivityAllocation(data,rule);
  expect(preview.items.map(r=>[r.development,r.maintenance])).toEqual([[420,280],[180,120]]);
  expect(preview.items.reduce((n,r)=>n+r.development,0)).toBe(600);
  const decision=approveActivityAllocation(preview,'Verifierad avstämning');
  const parts=approvedActivityParts(data,rule,decision);
  expect(parts).toHaveLength(4);
  const projected={...data,records:[...data.records,...parts]};
  expect(summarizeCanonical(projected,'work',['it_hours'],'all').value).toBe(1000);
  expect(JSON.stringify(data)).toBe(before);
 });
 it('persists adjusted LO shares in approval and projects exact totals without mutating original imports',()=>{
  const data=fixture(),before=JSON.stringify(data),proposal=previewActivityAllocation(data,rule);
  const decision=approveActivityAllocation(proposal,'Omfördelning beslutad',[{loId:'lo1',developmentPercent:50}]);
  expect(decision.overrides).toEqual([{loId:'lo1',developmentPercent:50}]);
  const persisted=JSON.parse(JSON.stringify(decision)) as typeof decision;
  const projected=approvedActivityParts(data,rule,persisted);
  expect(projected.filter(r=>r.activity==='development').map(r=>r.value)).toEqual([350,250]);
  expect(projected.reduce((sum,r)=>sum+r.value,0)).toBe(1000);
  expect(JSON.stringify(data)).toBe(before);
 });
 it('invalidates adjusted approval if source values change and rejects impossible overrides',()=>{
  const data=fixture(),preview=previewActivityAllocation(data,rule);
  expect(()=>approveActivityAllocation(preview,'Omöjlig',[{loId:'lo1',developmentPercent:100}])).toThrow('INFEASIBLE_LO_DISTRIBUTION');
  const decision=approveActivityAllocation(preview,'Avstämt',[{loId:'lo1',developmentPercent:60}]);
  const changed=fixture();changed.records[2].value=680;changed.records[3].value=320;
  expect(approvedActivityParts(changed,rule,decision)).toEqual([]);
  expect(approvedActivityParts(data,rule,{...decision,overrides:[{loId:'lo1',developmentPercent:101}]})).toEqual([]);
 });
 it('invalidates approval on reimported source change',()=>{
  const data=fixture(),decision=approveActivityAllocation(previewActivityAllocation(data,rule),'Godkänt');
  const changed=fixture();changed.records[2].value=680;changed.records[3].value=320;
  expect(approvedActivityParts(changed,rule,decision)).toEqual([]);
 });
 it('rejects unbalanced source totals, existing LO activity values and monthly/annual overlap',()=>{
  const data=fixture();data.records[3].value=290;
  expect(()=>previewActivityAllocation(data,rule)).toThrow('UO_LO_TOTAL_MISMATCH');
  const prior=fixture();prior.records.push({...base('F26',500,'development','lo1'),granularity:'activity-part',workloadId:'other'});
  expect(()=>previewActivityAllocation(prior,rule)).toThrow('EXISTING_LO_ACTIVITY_DATA');
  const monthly=fixture();monthly.records[2].month=1;
  expect(()=>previewActivityAllocation(monthly,rule)).toThrow('MONTHLY_ALLOCATION_UNSUPPORTED');
 });
 it('requires approval reason and rejects stale or absent decision',()=>{
  const data=fixture(),preview=previewActivityAllocation(data,rule);
  expect(()=>approveActivityAllocation(preview,'  ')).toThrow('APPROVAL_REASON_REQUIRED');
  expect(approvedActivityParts(data,rule,{ruleId:rule.id,fingerprint:'old',approvedAt:'2026',reason:'old'})).toEqual([]);
 });
});
