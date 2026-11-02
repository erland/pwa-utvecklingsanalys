import type {AnalysisRecord,CanonicalDataset,Metric} from '../domain/canonical';

export type UoAllocationEligibility={
 uoId:string; year:number; metric:Metric; status:'imported-locked'|'manual-allowed';
 development?:number; maintenance?:number;
};
/** A complete original UO pair is immutable. Missing pairs never imply a zero-valued activity. */
export function uoAllocationEligibility(data:CanonicalDataset):UoAllocationEligibility[]{
 const candidates=new Set<string>();
 const pairs=new Map<string,{development?:number;maintenance?:number}>();
 const key=(uoId:string,year:number,metric:Metric)=>JSON.stringify([uoId,year,metric]);
 for(const r of data.records){
  if(r.scope.axis!=='work'||r.authority!=='original'||r.approval!=='reported')continue;
  if(r.granularity==='total'&&r.metric!=='consultant_cost'&&r.value>=0)
   candidates.add(key(r.scope.uoId,r.year,r.metric));
  if(r.granularity==='activity-part'&&r.workPart==='uo-activity-matrix'&&(r.activity==='development'||r.activity==='maintenance')){
   const k=key(r.scope.uoId,r.year,r.metric);
   const pair=pairs.get(k)??{};
   // Do not silently sum duplicate imported matrices from independent sources.
   if(pair[r.activity]!==undefined)throw new Error('DUPLICATE_UO_ACTIVITY_SOURCE');
   pair[r.activity]=r.value;
   pairs.set(k,pair);candidates.add(k);
  }
 }
 return [...candidates].map(k=>{
  const [uoId,year,metric]=JSON.parse(k) as [string,number,Metric];
  const pair=pairs.get(k);
  if(pair?.development!==undefined&&pair.maintenance!==undefined)
   return {uoId,year,metric,status:'imported-locked' as const,development:pair.development,maintenance:pair.maintenance};
  return {uoId,year,metric,status:'manual-allowed' as const};
 }).sort((a,b)=>a.uoId.localeCompare(b.uoId,'sv')||a.year-b.year||a.metric.localeCompare(b.metric));
}
