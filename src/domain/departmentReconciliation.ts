import type {SemanticDataset} from './semantic';

export type DepartmentReconciliation={
 datasetId:string;uoId:string;year:number;metric:'it_hours'|'business_hours';
 departmentHours:number;budgetHours:number|null;difference:number|null;
 status:'matched'|'different'|'no-budget';
};

/** Source-local alternative breakdown; never mutate or add to ordinary budget totals. */
export function reconcileDepartmentDemand(data:SemanticDataset):DepartmentReconciliation[]{
 const groups=new Map<string,{datasetId:string;uoId:string;year:number;metric:'it_hours'|'business_hours';hours:number}>();
 for(const d of data.departmentDemand??[]){
  const key=JSON.stringify([d.source.datasetId,d.uoId,d.year,d.metric]);
  const prev=groups.get(key);
  groups.set(key,{datasetId:d.source.datasetId,uoId:d.uoId,year:d.year,metric:d.metric,hours:(prev?.hours??0)+d.hours});
 }
 return [...groups.values()].map(group=>{
  const entities=new Set(data.entities.filter(e=>e.id===group.uoId||e.parentId===group.uoId).map(e=>e.id));
  const rows=data.observations.filter(o=>o.source.datasetId===group.datasetId&&entities.has(o.entityId)&&o.measureId===group.metric&&o.period.year===group.year&&o.kind==='detail');
  // Annual facts replace monthly facts per entity, but totals are never summed across both.
  const annualEntities=new Set(rows.filter(o=>o.period.month===undefined).map(o=>o.entityId));
  const counted=rows.filter(o=>o.period.month===undefined||!annualEntities.has(o.entityId));
  const budgetHours=counted.length?counted.reduce((sum,o)=>sum+o.value,0):null;
  const difference=budgetHours===null?null:group.hours-budgetHours;
  return {datasetId:group.datasetId,uoId:group.uoId,year:group.year,metric:group.metric,departmentHours:group.hours,budgetHours,difference,status:budgetHours===null?'no-budget':Math.abs(difference!)<=1e-6?'matched':'different'} as DepartmentReconciliation;
 }).sort((a,b)=>a.uoId.localeCompare(b.uoId)||a.year-b.year||a.metric.localeCompare(b.metric));
}
