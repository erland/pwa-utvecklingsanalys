import {rebalanceUoBudgetAllocation,type LoDevelopmentOverride} from '../import/formats/uoBudgetCompletion';
import {validateCanonical,type Activity,type AnalysisRecord,type CanonicalDataset,type Metric} from './canonical';

/** Decisions are kept separately from immutable imported observations. */
export type ActivityAllocationRule={id:string;datasetId:string;uoId:string;metric:Metric;year:number;reason:string};
export type ActivityAllocationDecision={ruleId:string;fingerprint:string;approvedAt:string;reason:string;overrides?:LoDevelopmentOverride[]};
export type AllocationPreview={ruleId:string;fingerprint:string;uo:{development:number;maintenance:number};items:{loId:string;total:number;development:number;maintenance:number;workloadId:string}[]};

const sortRows=(rows:AnalysisRecord[])=>rows.map(r=>[r.id,r.value,r.metric,r.year,r.month??'',r.activity,r.workloadId,r.scope,r.source]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
export function previewActivityAllocation(data:CanonicalDataset,rule:ActivityAllocationRule):AllocationPreview{
 const errors=validateCanonical(data);if(errors.length)throw new Error(errors.join(','));
 if(!rule.id?.trim()||!rule.datasetId||!rule.uoId||!['it_hours','business_hours'].includes(rule.metric)||!Number.isInteger(rule.year)||!rule.reason?.trim())throw new Error('INVALID_ALLOCATION_RULE');
 const original=data.records.filter(r=>r.authority==='original'&&r.approval==='reported'&&r.source?.datasetId===rule.datasetId&&r.metric===rule.metric&&r.year===rule.year&&r.scope.axis==='work'&&r.scope.uoId===rule.uoId);
 // Use annual LO records when available; otherwise roll up monthly LO source values
 // into a virtual annual total for approval. Never mutate source records or add months
 // on top of an annual record for the same LO.
 const matrix=original.filter(r=>r.granularity==='activity-part'&&r.month===undefined&&r.scope.axis==='work'&&!r.scope.loId);
 const loSources=original.filter(r=>r.granularity==='total'&&r.scope.axis==='work'&&Boolean(r.scope.loId));
 const loIdsForYear=[...new Set(loSources.map(r=>r.scope.axis==='work'?r.scope.loId:''))];
 const loTotals:AnalysisRecord[]=loIdsForYear.flatMap(loId=>{
  const items=loSources.filter(r=>r.scope.axis==='work'&&r.scope.loId===loId);
  const annual=items.filter(r=>r.month===undefined);
  const monthly=items.filter(r=>r.month!==undefined);
  if(annual.length&&!(annual.length===1&&annual[0].value===0&&monthly.some(r=>r.value!==0)))return annual;
  if(!monthly.length)return annual;
  const representative=items[0];
  return [{...representative,id:representative.id+'|annual-rollup',month:undefined,value:monthly.reduce((sum,r)=>sum+r.value,0)}];
 });
 if(matrix.length!==2||!loTotals.length||!matrix.some(r=>r.activity==='development')||!matrix.some(r=>r.activity==='maintenance'))throw new Error('INCOMPLETE_UO_OR_LO');
 const dev=matrix.find(r=>r.activity==='development')!.value,maintenance=matrix.find(r=>r.activity==='maintenance')!.value,sourceTotal=dev+maintenance;
 const loIds=new Set(loTotals.map(r=>r.scope.axis==='work'?r.scope.loId:''));
 if(loIds.size!==loTotals.length)throw new Error('DUPLICATE_LO_TOTAL');
 const total=loTotals.reduce((n,r)=>n+r.value,0);
 if(sourceTotal<0||total<=0||Math.abs(sourceTotal-total)>Math.max(0.000001,total*0.000001))throw new Error('UO_LO_TOTAL_MISMATCH');
 const existing=data.records.filter(r=>r.metric===rule.metric&&r.year===rule.year&&r.scope.axis==='work'&&r.scope.uoId===rule.uoId&&Boolean(r.scope.loId)&&r.granularity==='activity-part');
 if(existing.length)throw new Error('EXISTING_LO_ACTIVITY_DATA');
 let allocatedDev=0;
 const items=loTotals.sort((a,b)=>a.id.localeCompare(b.id)).map((r,i,all)=>{
  const development=i===all.length-1?dev-allocatedDev:dev*r.value/total;
  allocatedDev+=development;
  const loId=r.scope.axis==='work'?r.scope.loId!:'';
  return {loId,total:r.value,development,maintenance:r.value-development,workloadId:r.workloadId};
 });
 // Source proportions apply only when the LO and UO totals reconcile. All provenance is fingerprinted.
 const fingerprint=JSON.stringify([rule.datasetId,rule.uoId,rule.metric,rule.year,sortRows([...matrix,...loSources])]);
 return {ruleId:rule.id,fingerprint,uo:{development:dev,maintenance},items};
}
export function approveActivityAllocation(preview:AllocationPreview,reason:string,overrides:readonly LoDevelopmentOverride[]=[]):ActivityAllocationDecision{
 if(!reason.trim())throw new Error('APPROVAL_REASON_REQUIRED');
 // Validate the complete balancing before storing any user-supplied percentages.
 rebalanceUoBudgetAllocation(preview,overrides);
 return {ruleId:preview.ruleId,fingerprint:preview.fingerprint,approvedAt:new Date().toISOString(),reason:reason.trim(),...(overrides.length?{overrides:overrides.map(o=>({...o}))}:{})};
}
/** Generate read-only approved completions; never write them into original source storage. */
export function approvedActivityParts(data:CanonicalDataset,rule:ActivityAllocationRule,decision:ActivityAllocationDecision):AnalysisRecord[]{
 if(decision.ruleId!==rule.id||!decision.approvedAt||!decision.reason?.trim())return [];
 let preview:AllocationPreview;
 try{preview=previewActivityAllocation(data,rule)}catch{return []}
 if(preview.fingerprint!==decision.fingerprint)return [];
 try{preview=rebalanceUoBudgetAllocation(preview,decision.overrides??[])}catch{return []}
 return preview.items.flatMap(item=>['development','maintenance'].map(activity=>({
  id:['allocation',rule.id,item.loId,activity,rule.year].join('|'),metric:rule.metric,year:rule.year,
  value:activity==='development'?item.development:item.maintenance,
  activity:activity as Activity,scope:{axis:'work' as const,uoId:rule.uoId,loId:item.loId},authority:'derived' as const,approval:'approved' as const,
  granularity:'activity-part' as const,workloadId:item.workloadId
 })));
}
