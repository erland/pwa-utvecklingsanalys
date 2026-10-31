import {describe,it,expect} from 'vitest';
import {emptyCanonical,summarizeCanonical,type AnalysisRecord} from './canonical';
import {previewActivityAllocation,approveActivityAllocation,approveSharedActivityAllocation,approveBalancedActivityGroup,approvedActivityParts,type ActivityAllocationRule} from './activityAllocation';
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
 it('uses UO matrix percentages when source totals differ and rejects existing LO activity values',()=>{
  const data=fixture();data.records[3].value=290;
  expect(previewActivityAllocation(data,rule).uo.development).toBeCloseTo(594);
  const prior=fixture();prior.records.push({...base('F26',500,'development','lo1'),granularity:'activity-part',workloadId:'other'});
  expect(()=>previewActivityAllocation(prior,rule)).toThrow('EXISTING_LO_ACTIVITY_DATA');
 });
 it('aggregates month-only LO inputs into annual allocation without mutating originals',()=>{
  const data=fixture();
  data.records.splice(2,2,
   {...base('D26',300,'unknown','lo1'),month:1},
   {...base('E26',400,'unknown','lo1'),month:2},
   {...base('D32',100,'unknown','lo2'),month:1},
   {...base('E32',200,'unknown','lo2'),month:2});
  const before=JSON.stringify(data);
  const preview=previewActivityAllocation(data,rule);
  expect(preview.items.map(x=>[x.total,x.development,x.maintenance])).toEqual([[700,420,280],[300,180,120]]);
  const decision=approveActivityAllocation(preview,'Årsvärden kontrollerade');
  expect(approvedActivityParts(data,rule,decision)).toHaveLength(4);
  expect(JSON.stringify(data)).toBe(before);
 });
 it('prefers a yearly LO total instead of adding its monthly rows',()=>{
  const data=fixture();
  data.records.push({...base('E26',300,'unknown','lo1'),month:1});
  const preview=previewActivityAllocation(data,rule);
  expect(preview.items.find(x=>x.loId==='lo1')?.total).toBe(700);
 });
 it('uses monthly values if the annual 2027 cell is an empty zero placeholder',()=>{
  const data=fixture();
  data.records[2].value=0;
  data.records.push({...base('E26',700,'unknown','lo1'),month:1});
  expect(previewActivityAllocation(data,rule).items.find(x=>x.loId==='lo1')?.total).toBe(700);
 });
 it('includes UO overhead alongside LO and uses their summed total with UO matrix percentages',()=>{
  const data=fixture();
  data.records.push({...base('F26',200,'unknown'),granularity:'total',workPart:'uo-overhead',workloadId:'ds|uo|overhead|it_hours|2027'});
  const original=JSON.stringify(data);
  const preview=previewActivityAllocation(data,rule);
  expect(preview.items.map(i=>i.total).reduce((a,b)=>a+b,0)).toBe(1200);
  expect(preview.uo.development).toBe(720);
  expect(preview.uo.maintenance).toBe(480);
  const decision=approveActivityAllocation(preview,'Godkänd fördelning');
  const derived=approvedActivityParts(data,rule,decision);
  expect(derived).toHaveLength(6);
  expect(derived.filter(r=>r.workPart==='uo-overhead')).toHaveLength(2);
  expect(derived.filter(r=>r.workPart==='uo-overhead').every(r=>r.scope.axis==='work'&&!r.scope.loId)).toBe(true);
  expect(JSON.stringify(data)).toBe(original);
 });
 it('shared per-LO annual percent is independent of the separate UO metric total',()=>{
  const data=fixture(),preview=previewActivityAllocation(data,rule);
  const decision=approveSharedActivityAllocation(preview,'Gemensam utvecklingsandel',[
   {loId:'lo1',developmentPercent:20},{loId:'lo2',developmentPercent:80}
  ]);
  const rows=approvedActivityParts(data,rule,decision);
  expect(rows.filter(r=>r.activity==='development').map(r=>r.value)).toEqual([140,240]);
  expect(rows.filter(r=>r.activity==='maintenance').map(r=>r.value)).toEqual([560,60]);
  expect(rows.reduce((n,r)=>n+r.value,0)).toBe(1000);
 });
 it('requires approval reason and rejects stale or absent decision',()=>{
  const data=fixture(),preview=previewActivityAllocation(data,rule);
  expect(()=>approveActivityAllocation(preview,'  ')).toThrow('APPROVAL_REASON_REQUIRED');
  expect(approvedActivityParts(data,rule,{ruleId:rule.id,fingerprint:'old',approvedAt:'2026',reason:'old'})).toEqual([]);
 });
 it('validates all metric previews before issuing shared balanced decisions',()=>{
  const itPreview=previewActivityAllocation(fixture(),rule);
  const businessPreview={...itPreview,ruleId:'business-rule',uo:{development:550,maintenance:450}};
  const originals=JSON.stringify([itPreview,businessPreview]);
  expect(()=>approveBalancedActivityGroup([itPreview,businessPreview],'Group',[
   {loId:'lo1',developmentPercent:80}
  ])).toThrow('INFEASIBLE_LO_DISTRIBUTION');
  expect(JSON.stringify([itPreview,businessPreview])).toBe(originals);
  const decisions=approveBalancedActivityGroup([itPreview,businessPreview],'Group',[
   {loId:'lo1',developmentPercent:50}
  ]);
  expect(decisions).toHaveLength(2);
  expect(decisions.every(d=>d.sharedPercentages!==true)).toBe(true);
  expect(decisions.map(d=>d.ruleId)).toEqual([rule.id,'business-rule']);
  expect(()=>approveBalancedActivityGroup([itPreview,itPreview],'Group',[])).toThrow('DUPLICATE_ACTIVITY_RULE');
 });

 it('preserves complete imported LO while distributing remaining hours and excludes duplicated derivations',()=>{
  const data=fixture();
  data.records.push({...base('IMP1',300,'development','lo1'),granularity:'activity-part'});
  data.records.push({...base('IMP2',400,'maintenance','lo1'),granularity:'activity-part'});
  const before=JSON.stringify(data);
  const proposal=previewActivityAllocation(data,rule);
  expect(proposal.lockedLo).toEqual([{loId:'lo1',development:300,maintenance:400}]);
  expect(proposal.items.find(i=>i.loId==='lo2')?.development).toBe(300);
  expect(()=>approveActivityAllocation(proposal,'Otillåtet',[{loId:'lo1',developmentPercent:50}])).toThrow('LOCKED_LO_OVERRIDE');
  const approved=approveActivityAllocation(proposal,'Godkänt');
  const derived=approvedActivityParts(data,rule,approved);
  expect(derived).toHaveLength(2);
  expect(derived.every(r=>r.scope.axis==='work'&&r.scope.loId==='lo2')).toBe(true);
  expect(derived.filter(r=>r.activity==='development')[0].value).toBe(300);
  expect(JSON.stringify(data)).toBe(before);
  const changed=fixture();
  changed.records.push({...base('IMP1',250,'development','lo1'),granularity:'activity-part'});
  changed.records.push({...base('IMP2',450,'maintenance','lo1'),granularity:'activity-part'});
  expect(approvedActivityParts(changed,rule,approved)).toEqual([]);
 });
 it('rejects incomplete imported LO activities rather than silently overwriting originals',()=>{
  const data=fixture();
  data.records.push({...base('IMP1',200,'development','lo1'),granularity:'activity-part'});
  expect(()=>previewActivityAllocation(data,rule)).toThrow('INCOMPLETE_IMPORTED_LO_ACTIVITY');
 });

});
