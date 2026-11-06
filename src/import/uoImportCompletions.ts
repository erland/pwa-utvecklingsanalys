import type {AnalysisRecord,CanonicalDataset,Metric} from '../domain/canonical';
import {manualUoFingerprint,manualSplitKey} from '../allocations/manualUoAllocation';
import {uoAllocationEligibility} from '../allocations/uoAllocationEligibility';

export type UoImportCompletion={uoId:string;year:number;metric:Metric;development:number;maintenance:number;sourceFingerprint:string};
export const completionKey=manualSplitKey;
export function activeUoImportCompletions(data:CanonicalDataset,items:readonly UoImportCompletion[]):UoImportCompletion[]{
 const eligible=new Set(uoAllocationEligibility(data).filter(r=>r.status==='manual-allowed').map(completionKey));
 return items.filter(c=>eligible.has(completionKey(c))&&c.sourceFingerprint===manualUoFingerprint(data,c.uoId,c.year,c.metric)&&
  Number.isFinite(c.development)&&c.development>=0&&Number.isFinite(c.maintenance)&&c.maintenance>=0);
}
export function saveUoImportCompletion(data:CanonicalDataset,previous:readonly UoImportCompletion[],input:Omit<UoImportCompletion,'sourceFingerprint'>):UoImportCompletion[]{
 const candidate={...input,sourceFingerprint:manualUoFingerprint(data,input.uoId,input.year,input.metric)};
 if(!activeUoImportCompletions(data,[candidate]).length)throw new Error('INVALID_OR_LOCKED_UO_COMPLETION');
 const imported=data.records.filter(r=>r.authority==='original'&&r.scope.axis==='work'&&r.scope.uoId===input.uoId&&r.year===input.year&&r.metric===input.metric&&r.workPart==='uo-activity-matrix');
 for(const row of imported.filter(r=>!r.assumedZero)){
  if(row.activity==='development'&&Math.abs(row.value-input.development)>1e-7||row.activity==='maintenance'&&Math.abs(row.value-input.maintenance)>1e-7)
   throw new Error('IMPORTED_ACTIVITY_MUST_BE_PRESERVED');
 }
 if(input.development+input.maintenance<=0)throw new Error('EMPTY_UO_COMPLETION');
 return [...previous.filter(row=>completionKey(row)!==completionKey(input)),candidate];
}

/** Present approved source corrections to existing UO/LO allocation UI without mutating persisted imports. */
export function withCompletedUoMatrices(data:CanonicalDataset,completions:readonly UoImportCompletion[]):CanonicalDataset{
 const records=[...data.records];
 for(const item of activeUoImportCompletions(data,completions)){
  const group=records.filter(r=>r.authority==='original'&&r.approval==='reported'&&r.scope.axis==='work'&&r.scope.uoId===item.uoId&&r.year===item.year&&r.metric===item.metric&&r.workPart==='uo-activity-matrix');
  for(const assumed of group.filter(r=>r.assumedZero)){
   const index=records.indexOf(assumed);
   records[index]={...assumed,value:item[assumed.activity as 'development'|'maintenance'],assumedZero:false};
  }
  const source=group[0]??records.find(r=>r.authority==='original'&&r.scope.axis==='work'&&r.scope.uoId===item.uoId&&r.year===item.year&&r.metric===item.metric&&r.source);
  if(!source?.source)continue;
  for(const activity of ['development','maintenance'] as const){
   if(group.some(r=>r.activity===activity))continue;
   const record:AnalysisRecord={id:['import-completion',source.source.datasetId,item.uoId,item.year,item.metric,activity].join('|'),
    metric:item.metric,year:item.year,value:item[activity],activity,scope:{axis:'work',uoId:item.uoId},
    authority:'original',approval:'reported',granularity:'activity-part',workPart:'uo-activity-matrix',
    workloadId:group[0]?.workloadId??['completed-uo',source.source.datasetId,item.uoId,item.year,item.metric].join('|'),
    source:{datasetId:source.source.datasetId,sheet:'Manuell importkomplettering',cell:source.source.cell}};
   records.push(record);
  }
 }
 return {...data,records};
}
