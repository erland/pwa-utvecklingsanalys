import type {CanonicalDataset,Metric} from '../domain/canonical';
import {uoAllocationEligibility} from './uoAllocationEligibility';

export type ManualUoSplit={uoId:string;year:number;metric:Metric;developmentPercent:number;sourceFingerprint:string};
export const manualSplitKey=(s:Pick<ManualUoSplit,'uoId'|'year'|'metric'>)=>JSON.stringify([s.uoId,s.year,s.metric]);
/** Fingerprints source observations so a replacement import invalidates stale manual decisions. */
export function manualUoFingerprint(data:CanonicalDataset,uoId:string,year:number,metric:Metric):string{
 return JSON.stringify(data.records.filter(r=>r.scope.axis==='work'&&r.scope.uoId===uoId&&r.year===year&&r.metric===metric&&r.authority==='original')
  .map(r=>[r.id,r.value,r.activity,r.workPart,r.granularity,r.month,r.source?.datasetId,r.source?.cell]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))));
}
export function saveManualUoSplit(data:CanonicalDataset,existing:readonly ManualUoSplit[],input:Pick<ManualUoSplit,'uoId'|'year'|'metric'|'developmentPercent'>):ManualUoSplit[]{
 if(!Number.isFinite(input.developmentPercent)||input.developmentPercent<0||input.developmentPercent>100)throw new Error('INVALID_DEVELOPMENT_PERCENT');
 const eligibility=uoAllocationEligibility(data).find(r=>r.uoId===input.uoId&&r.year===input.year&&r.metric===input.metric);
 if(!eligibility||eligibility.status!=='manual-allowed')throw new Error('IMPORTED_UO_SPLIT_LOCKED_OR_MISSING');
 const next={...input,sourceFingerprint:manualUoFingerprint(data,input.uoId,input.year,input.metric)};
 return [...existing.filter(r=>manualSplitKey(r)!==manualSplitKey(input)),next];
}
export function activeManualUoSplits(data:CanonicalDataset,decisions:readonly ManualUoSplit[]):ManualUoSplit[]{
 const allowed=new Set(uoAllocationEligibility(data).filter(r=>r.status==='manual-allowed').map(manualSplitKey));
 return decisions.filter(d=>allowed.has(manualSplitKey(d))&&d.sourceFingerprint===manualUoFingerprint(data,d.uoId,d.year,d.metric)&&Number.isFinite(d.developmentPercent)&&d.developmentPercent>=0&&d.developmentPercent<=100);
}
