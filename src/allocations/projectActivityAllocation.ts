import type {AnalysisRecord,CanonicalDataset} from '../domain/canonical';

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
/** Derived rows describe the SAME source volume as a reported project total. */
export function projectActivityParts(data:CanonicalDataset,decisions:readonly ProjectActivitySplit[]):AnalysisRecord[]{
 const originals=new Map(projectAllocationRows(data).map(r=>[r.workloadId,r]));
 return activeProjectActivitySplits(data,decisions).flatMap(decision=>{
  const total=originals.get(decision.workloadId)!;
  const development=total.value*decision.developmentPercent/100;
  return (['development','maintenance'] as const).map(activity=>({
   ...total,id:'project-activity|'+total.id+'|'+activity,
   value:activity==='development'?development:total.value-development,
   activity,granularity:'activity-part' as const,authority:'derived' as const,approval:'approved' as const,
   source:undefined
  }));
 });
}
