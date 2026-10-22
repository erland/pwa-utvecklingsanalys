/** Canonical analysis contract v2. Independently versioned from the legacy Excel import pipeline.
 * No conversion of earlier imports is attempted: CHANGE-026 will write v2 records.
 */
export type Activity='development'|'maintenance'|'unknown';
export type SourceAuthority='original'|'manual'|'derived';
export type ApprovalState='reported'|'pending'|'approved';
export type ReportingAxis='work'|'department';
export type WorkScope={axis:'work';uoId:string;loId?:string};
export type DepartmentScope={axis:'department';departmentId:string};
export type AnalysisScope=WorkScope|DepartmentScope;
export type Metric='it_hours'|'business_hours'|'consultant_cost'|'other_cost';
export type AnalysisRecord={
 id:string;metric:Metric;value:number;year:number;month?:number;
 activity:Activity;scope:AnalysisScope;authority:SourceAuthority;approval:ApprovalState;
 /** Identity of the underlying workload: records with different axes can describe the same total. */
 workloadId:string;
 /** A total with unknown activity is not additional volume alongside its approved breakdown. */
 granularity:'total'|'activity-part';
 source?:{datasetId:string;sheet:string;cell:string};
};
export type CanonicalDataset={schemaVersion:2;records:AnalysisRecord[]};
export const emptyCanonical=():CanonicalDataset=>({schemaVersion:2,records:[]});
export function validateCanonical(dataset:CanonicalDataset):string[]{
 const errors:string[]=[];
 if(dataset.schemaVersion!==2||!Array.isArray(dataset.records))return ['INVALID_CANONICAL_VERSION'];
 const ids=new Set<string>();
 const signatures=new Map<string,{total:number;parts:number;seen:Set<Activity>}>();
 for(const r of dataset.records){
  if(!r.id?.trim()||ids.has(r.id))errors.push('DUPLICATE_OR_EMPTY_ID');
  ids.add(r.id);
  if(!Number.isFinite(r.value)||r.value<0)errors.push('INVALID_VALUE');
  if(!Number.isInteger(r.year)||r.year<2000||r.year>2100||r.month!==undefined&&(!Number.isInteger(r.month)||r.month<1||r.month>12))errors.push('INVALID_PERIOD');
  if(!['it_hours','business_hours','consultant_cost','other_cost'].includes(r.metric))errors.push('INVALID_METRIC');
  if(!['development','maintenance','unknown'].includes(r.activity))errors.push('INVALID_ACTIVITY');
  if(!['original','manual','derived'].includes(r.authority)||!['reported','pending','approved'].includes(r.approval))errors.push('INVALID_PROVENANCE');
  if(r.authority==='original'&&(!r.source?.datasetId||!r.source.sheet||!r.source.cell))errors.push('SOURCE_REQUIRED');
  if(r.authority!=='original'&&r.approval==='reported')errors.push('UNAPPROVED_ORIGIN');
  if(!r.workloadId?.trim())errors.push('WORKLOAD_REQUIRED');
  if(r.scope.axis==='work'){if(!r.scope.uoId?.trim())errors.push('UO_REQUIRED')}
  else if(r.scope.axis==='department'){if(!r.scope.departmentId?.trim())errors.push('DEPARTMENT_REQUIRED')}
  else errors.push('INVALID_AXIS');
  if(r.granularity==='total'&&r.activity!=='unknown'||r.granularity==='activity-part'&&r.activity==='unknown')errors.push('INVALID_GRANULARITY');
  // A reported total and its component parts are two descriptions of the same workload, not additive records.
  const key=JSON.stringify([r.workloadId,r.metric,r.year,r.month??null,r.scope]);
  const found=signatures.get(key)??{total:0,parts:0,seen:new Set<Activity>()};
  if(r.granularity==='total')found.total++;
  else{found.parts++;if(found.seen.has(r.activity))errors.push('DUPLICATE_ACTIVITY_PART');found.seen.add(r.activity)}
  signatures.set(key,found);
 }
 for(const group of signatures.values())if(group.total>1)errors.push('DUPLICATE_TOTAL');
 return [...new Set(errors)];
}
/** Summarize one reporting axis, never add its alternative allocations from another axis.
 * Activity-part records are used only when the full activity breakdown is approved.
 * Otherwise a reported total is used and its activity coverage remains unknown.
 */
export function summarizeCanonical(data:CanonicalDataset,axis:ReportingAxis,metrics:Metric[],activity:Activity|'all'='all'){
 const errors=validateCanonical(data);if(errors.length)throw new Error(errors.join(','));
 const groups=new Map<string,AnalysisRecord[]>();
 for(const r of data.records.filter(x=>x.scope.axis===axis&&metrics.includes(x.metric))){
  const key=JSON.stringify([r.workloadId,r.metric,r.year,r.month??null,r.scope]);
  groups.set(key,[...(groups.get(key)??[]),r]);
 }
 let value=0,unknown=0,uncovered=0;
 for(const records of groups.values()){
  const approved=records.filter(r=>r.approval==='approved'||r.authority==='original'&&r.approval==='reported');
  const parts=approved.filter(r=>r.granularity==='activity-part');
  const complete=parts.some(r=>r.activity==='development')&&parts.some(r=>r.activity==='maintenance');
  const total=approved.find(r=>r.granularity==='total');
  if(activity==='all'){
   if(total){value+=total.value;uncovered++}
   else if(complete)value+=parts.reduce((n,r)=>n+r.value,0);
   else if(parts.length)unknown++;
  }else if(activity==='unknown'){
   if(total&&!complete){value+=total.value;unknown++}
  }else if(complete){value+=parts.find(r=>r.activity===activity)?.value??0}
  else if(total||parts.length)unknown++;
 }
 return {value,unknown,uncovered,unit:metrics.every(x=>x.endsWith('hours'))?'h':'SEK'};
}
