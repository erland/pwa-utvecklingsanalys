import type {CanonicalDataset,Metric} from '../domain/canonical';
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
 for(const row of imported){
  if(row.activity==='development'&&Math.abs(row.value-input.development)>1e-7||row.activity==='maintenance'&&Math.abs(row.value-input.maintenance)>1e-7)
   throw new Error('IMPORTED_ACTIVITY_MUST_BE_PRESERVED');
 }
 if(input.development+input.maintenance<=0)throw new Error('EMPTY_UO_COMPLETION');
 return [...previous.filter(row=>completionKey(row)!==completionKey(input)),candidate];
}
