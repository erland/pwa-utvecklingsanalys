import type {AnalysisRecord,CanonicalDataset,Metric} from '../domain/canonical';

export type ProjectImportCompletion={projectId:string;year:number;metric:Metric;development:number;maintenance:number;sourceFingerprint:string};
const completionKey=(projectId:string,year:number,metric:Metric)=>JSON.stringify([projectId,year,metric==='consultant_cost'?'other_cost':metric]);
export function projectCompletionRows(data:CanonicalDataset){
 const rows=new Map<string,{projectId:string;year:number;metric:Metric;development?:number;maintenance?:number;developmentAssumed:boolean;maintenanceAssumed:boolean;sourceFingerprint:string}>();
 for(const r of projectAllocationRows(data)){
  if(r.scope.axis!=='project')continue;
  const metric=r.metric==='consultant_cost'?'other_cost':r.metric;
  if(r.projectDefaultDevelopmentPercent!==undefined&&r.projectMatrixDevelopment===undefined&&r.projectMatrixMaintenance===undefined)continue;
  const k=completionKey(r.scope.projectId,r.year,metric),prev=rows.get(k);
  rows.set(k,{projectId:r.scope.projectId,year:r.year,metric,development:r.projectMatrixDevelopment,maintenance:r.projectMatrixMaintenance,
   developmentAssumed:!!r.projectMatrixDevelopmentAssumed,maintenanceAssumed:!!r.projectMatrixMaintenanceAssumed,
   sourceFingerprint:(prev?prev.sourceFingerprint+'|':'')+JSON.stringify([projectSourceFingerprint(r),r.projectMatrixDevelopment,r.projectMatrixMaintenance,r.projectMatrixDevelopmentAssumed,r.projectMatrixMaintenanceAssumed])});
 }
 return [...rows.values()].filter(r=>['it_hours','business_hours','other_cost'].includes(r.metric));
}
export function activeProjectImportCompletions(data:CanonicalDataset,items:readonly ProjectImportCompletion[]){
 const rows=new Map(projectCompletionRows(data).map(r=>[completionKey(r.projectId,r.year,r.metric),r]));
 return items.filter(c=>{const r=rows.get(completionKey(c.projectId,c.year,c.metric));return !!r&&r.sourceFingerprint===c.sourceFingerprint&&Number.isFinite(c.development)&&c.development>=0&&Number.isFinite(c.maintenance)&&c.maintenance>=0&&c.development+c.maintenance>0});
}
export function saveProjectImportCompletion(data:CanonicalDataset,items:readonly ProjectImportCompletion[],entry:Omit<ProjectImportCompletion,'sourceFingerprint'>){
 const r=projectCompletionRows(data).find(x=>completionKey(x.projectId,x.year,x.metric)===completionKey(entry.projectId,entry.year,entry.metric));
 if(!r||!Number.isFinite(entry.development)||entry.development<0||!Number.isFinite(entry.maintenance)||entry.maintenance<0||entry.development+entry.maintenance<=0)throw Error('INVALID_PROJECT_COMPLETION');
 if(r.development!==undefined&&!r.developmentAssumed&&Math.abs(entry.development-r.development)>1e-7||r.maintenance!==undefined&&!r.maintenanceAssumed&&Math.abs(entry.maintenance-r.maintenance)>1e-7)throw Error('IMPORTED_ACTIVITY_MUST_BE_PRESERVED');
 return [...items.filter(c=>completionKey(c.projectId,c.year,c.metric)!==completionKey(entry.projectId,entry.year,entry.metric)),{...entry,metric:r.metric,sourceFingerprint:r.sourceFingerprint}];
}
/** Manual allocation belongs to an imported project-part workload, not to an UO. */
export type ProjectActivitySplit={
 workloadId:string;sourceFingerprint:string;developmentPercent:number;
};
export const projectSourceFingerprint=(record:AnalysisRecord):string=>JSON.stringify([
 record.id,record.value,record.metric,record.year,record.month??null,
 record.source?.datasetId,record.source?.sheet,record.source?.cell,record.scope
]);
export function projectAllocationRows(data:CanonicalDataset):AnalysisRecord[]{
 return data.records.filter(r=>r.scope.axis==='project'&&r.granularity==='total'&&
  r.authority==='original'&&r.approval==='reported'&&r.month===undefined&&Boolean(r.source));
}
export function saveProjectActivitySplit(data:CanonicalDataset,existing:readonly ProjectActivitySplit[],input:{workloadId:string;developmentPercent:number}):ProjectActivitySplit[]{
 if(!Number.isFinite(input.developmentPercent)||input.developmentPercent<0||input.developmentPercent>100)throw new Error('INVALID_DEVELOPMENT_PERCENT');
 const candidates=projectAllocationRows(data).filter(r=>r.workloadId===input.workloadId);
 if(candidates.length!==1)throw new Error('PROJECT_WORKLOAD_NOT_FOUND_OR_AMBIGUOUS');
 const next={...input,sourceFingerprint:projectSourceFingerprint(candidates[0])};
 return [...existing.filter(e=>e.workloadId!==input.workloadId),next];
}
export function activeProjectActivitySplits(data:CanonicalDataset,decisions:readonly ProjectActivitySplit[]):ProjectActivitySplit[]{
 const records=new Map(projectAllocationRows(data).map(r=>[r.workloadId,r]));
 return decisions.filter(d=>{
  const record=records.get(d.workloadId);
  return Boolean(record&&d.sourceFingerprint===projectSourceFingerprint(record)&&
   Number.isFinite(d.developmentPercent)&&d.developmentPercent>=0&&d.developmentPercent<=100);
 });
}
/** Manual choices win. Missing decisions inherit only complete, source-derived
 * project percentages; no default 50/50 and no implicit zero for absent input.
 */
export function effectiveProjectActivitySplits(data:CanonicalDataset,decisions:readonly ProjectActivitySplit[],completions:readonly ProjectImportCompletion[]=[]){
 const manual=activeProjectActivitySplits(data,decisions);
 const override=new Map(activeProjectImportCompletions(data,completions).map(c=>[JSON.stringify([c.projectId,c.year,c.metric]),100*c.development/(c.development+c.maintenance)]));
 const active=new Set(manual.map(d=>d.workloadId));
 const automatic=projectAllocationRows(data).filter(r=>
  !active.has(r.workloadId)&&(r.projectDefaultDevelopmentPercent!==undefined||(r.scope.axis==='project'&&override.has(JSON.stringify([r.scope.projectId,r.year,r.metric==='consultant_cost'?'other_cost':r.metric])))))
  .map(r=>({workloadId:r.workloadId,developmentPercent:(r.scope.axis==='project'?override.get(JSON.stringify([r.scope.projectId,r.year,r.metric==='consultant_cost'?'other_cost':r.metric])):undefined)??r.projectDefaultDevelopmentPercent!,
   sourceFingerprint:projectSourceFingerprint(r),automatic:true as const}));
 return [...manual.map(d=>({...d,automatic:false as const})),...automatic];
}
/** Derived rows describe the SAME source volume as a reported project total. */
export function projectActivityParts(data:CanonicalDataset,decisions:readonly ProjectActivitySplit[],completions:readonly ProjectImportCompletion[]=[]):AnalysisRecord[]{
 const originals=new Map(projectAllocationRows(data).map(r=>[r.workloadId,r]));
 return effectiveProjectActivitySplits(data,decisions,completions).flatMap(decision=>{
  const total=originals.get(decision.workloadId)!;
  const development=total.value*decision.developmentPercent/100;
  return (['development','maintenance'] as const).map(activity=>({
   ...total,id:'project-activity|'+total.id+'|'+activity,
   value:activity==='development'?development:total.value-development,
   activity,granularity:'activity-part' as const,authority:'derived' as const,approval:'approved' as const,
   source:undefined,projectDefaultDevelopmentPercent:undefined
  }));
 });
}
