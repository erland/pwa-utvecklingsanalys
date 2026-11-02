import {approvedActivityParts,previewActivityAllocation,type ActivityAllocationRule} from './activityAllocation';
import type {AnalysisRecord,CanonicalDataset} from './canonical';
import type {GapState} from '../gaps/store';
import {activeManualUoSplits} from '../allocations/manualUoAllocation';
import {importedLoActivityLocks} from './importedLoLocks';
import {rebalanceUoBudgetAllocation} from '../import/formats/uoBudgetCompletion';
import type {AllocationPreview} from './activityAllocation';

/** Import/completion boundary. Resolve approved activity parts once before any analysis query.
 * Original imports and approvals are never overwritten.
 */
export type PreparedDataset=CanonicalDataset & {preparedAnalysis:{staleApprovals:number;excludedMatrix:number}};
export type PreparedAnalysis={dataset:PreparedDataset;staleApprovals:number;excludedMatrix:number};
export function prepareAnalysisDataset(source:CanonicalDataset,state:GapState):PreparedAnalysis{
 const approvalSource=(source as CanonicalDataset & {allocationSourceRecords?:AnalysisRecord[]}).allocationSourceRecords;
 const original:CanonicalDataset=approvalSource?{...source,records:approvalSource}:source;
 const calculated:AnalysisRecord[]=[];
 let staleApprovals=0;
 // Imported UO matrix values drive automatic LO splits even before the user edits anything.
 // Saved decisions take precedence and are validated against the current source fingerprint.
 const candidates=new Map<string,ActivityAllocationRule>();
 for(const record of original.records){
  if(record.authority!=='original'||record.approval!=='reported'||record.granularity!=='activity-part'||
   record.scope.axis!=='work'||record.scope.loId||record.workPart!=='uo-activity-matrix'||
   !record.source||!['it_hours','business_hours','other_cost'].includes(record.metric))continue;
  const metric=record.metric;
  const id=JSON.stringify({datasetId:record.source.datasetId,uoId:record.scope.uoId,metric,year:record.year});
  candidates.set(id,{id,datasetId:record.source.datasetId,uoId:record.scope.uoId,metric,year:record.year,reason:'Automatiskt från UO-matris'});
 }
 for(const rule of state.activityAllocationRules??[]){
  const id=JSON.stringify({datasetId:rule.datasetId,uoId:rule.uoId,metric:rule.metric,year:rule.year});
  candidates.set(id,rule);
 }
 for(const rule of candidates.values()){
  const decision=state.activityAllocationDecisions?.find(d=>d.ruleId===rule.id);
  let parts:AnalysisRecord[]=[];
  if(decision){
   parts=approvedActivityParts(original,rule,decision);
   if(!parts.length){staleApprovals++;continue}
  }else{
   try{
    const preview=previewActivityAllocation(original,rule);
    const locked=new Set((preview.lockedLo??[]).map(x=>x.loId));
    parts=preview.items.filter(item=>!locked.has(item.loId)).flatMap(item=>
     (['development','maintenance'] as const).map(activity=>({
      id:['auto-allocation',rule.id,item.loId,activity].join('|'),
      metric:rule.metric,year:rule.year,value:item[activity],
      activity,scope:item.loId.startsWith('uo-overhead:')?{axis:'work' as const,uoId:rule.uoId}:{axis:'work' as const,uoId:rule.uoId,loId:item.loId},
      ...(item.loId.startsWith('uo-overhead:')?{workPart:'uo-overhead' as const}:{}),
      authority:'derived' as const,approval:'approved' as const,granularity:'activity-part' as const,workloadId:item.workloadId
     }))
    );
   }catch{continue}
  }
  // Cost allocation has one shared UO ratio but two distinct LO cost metrics.
  // Allocate each category separately to prevent double-counting consultant costs.
  if(rule.metric==='other_cost'){
   for(const part of parts){
    const scopeKey=part.scope.axis==='work'?(part.scope.loId??'uo-overhead:'+part.scope.uoId):'';
    const sourceRows=original.records.filter(r=>r.source?.datasetId===rule.datasetId&&r.year===rule.year&&r.scope.axis==='work'&&r.scope.uoId===rule.uoId&&
     (r.scope.loId??'uo-overhead:'+r.scope.uoId)===scopeKey&&r.granularity==='total'&&
     (r.metric==='other_cost'||r.metric==='consultant_cost')&&r.authority==='original');
    for(const metric of ['other_cost','consultant_cost'] as const){
     const rows=sourceRows.filter(r=>r.metric===metric);
     const annual=rows.filter(r=>r.month===undefined);
     const basis=(annual.length?annual:rows).reduce((n,r)=>n+r.value,0);
     const total=sourceRows.reduce((n,r)=>n+(r.month===undefined||!sourceRows.some(a=>a.metric===r.metric&&a.month===undefined)?r.value:0),0);
     if(total>0&&basis>0)calculated.push({...part,id:part.id+'|'+metric,metric,value:part.value*basis/total,workloadId:rows[0]?.workloadId??part.workloadId});
    }
   }
  }else calculated.push(...parts);
 }
 // Manual UO percentages are decisions, not synthetic imported matrix values.
 // Materialize balanced, derived LO parts only when the source is still unchanged.
 for(const split of activeManualUoSplits(original,state.manualUoSplits??[])){
  // Cost decisions use one UO percentage across both cost metrics, but split each metric's LO totals separately.
  const splitMetrics=split.metric==='other_cost'?(['other_cost','consultant_cost'] as const):[split.metric];
  const sources=[...new Set(original.records.filter(r=>r.authority==='original'&&r.scope.axis==='work'&&r.scope.uoId===split.uoId&&r.year===split.year&&r.metric===split.metric&&r.granularity==='total').map(r=>r.source?.datasetId).filter((x):x is string=>Boolean(x)))];
  for(const datasetId of sources){
   for(const metric of splitMetrics){
   const scope={datasetId,uoId:split.uoId,year:split.year,metric};
   const {locks,incompleteLoIds}=importedLoActivityLocks(original,scope);
   if(incompleteLoIds.length){staleApprovals++;continue}
   const originals=original.records.filter(r=>r.authority==='original'&&r.approval==='reported'&&r.source?.datasetId===datasetId&&r.scope.axis==='work'&&r.scope.uoId===split.uoId&&r.year===split.year&&r.metric===metric&&r.granularity==='total'&&(r.scope.loId||r.workPart==='uo-overhead'));
   const groups=new Map<string,AnalysisRecord[]>();
   for(const r of originals){const id=r.scope.axis==='work'?(r.scope.loId??'uo-overhead:'+split.uoId):'';groups.set(id,[...(groups.get(id)??[]),r])}
   const items=[...groups].map(([loId,rows])=>{
    const annual=rows.filter(r=>r.month===undefined);
    const chosen=annual.length?annual:rows;
    if(annual.length>1||(!annual.length&&new Set(chosen.map(r=>r.month)).size!==chosen.length))throw new Error('AMBIGUOUS_MANUAL_LO_TOTAL');
    return {loId,total:chosen.reduce((n,r)=>n+r.value,0),workloadId:chosen[0].workloadId,development:0,maintenance:0};
   });
   if(!items.length)continue;
   const total=items.reduce((n,i)=>n+i.total,0),development=total*split.developmentPercent/100;
   const preview:AllocationPreview={ruleId:'manual:'+datasetId+':'+split.year+':'+metric,fingerprint:split.sourceFingerprint,items,uo:{development,maintenance:total-development},lockedLo:locks};
   let balanced:AllocationPreview;
   try{balanced=rebalanceUoBudgetAllocation(preview,[],locks)}catch{staleApprovals++;continue}
   for(const item of balanced.items){
    if(locks.some(l=>l.loId===item.loId))continue;
    for(const activity of ['development','maintenance'] as const)calculated.push({
     id:['manual-uo',datasetId,split.uoId,split.year,metric,item.loId,activity].join('|'),
     metric,year:split.year,value:item[activity],activity,
     scope:item.loId.startsWith('uo-overhead:')?{axis:'work',uoId:split.uoId}:{axis:'work',uoId:split.uoId,loId:item.loId},
     ...(item.loId.startsWith('uo-overhead:')?{workPart:'uo-overhead' as const}:{}),
     authority:'derived',approval:'approved',granularity:'activity-part',workloadId:item.workloadId
    });
   }
   }
  }
 }
 // The UO summary matrix is never volume. Older source records can omit workPart.
 const isMatrix=(r:AnalysisRecord)=>r.scope.axis==='work'&&!r.scope.loId&&r.granularity==='activity-part'&&(r.workPart==='uo-activity-matrix'||r.authority==='original');
 const excludedMatrix=source.records.filter(isMatrix).length;
 return {dataset:{schemaVersion:2,records:[...source.records.filter(r=>!isMatrix(r)),...calculated],preparedAnalysis:{staleApprovals,excludedMatrix}},staleApprovals,excludedMatrix};
}
