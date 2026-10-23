import type {ImportResult,Measure} from './uoBudget';

/** Non-mutating source reconciliation. Matrix values are alternative reporting, never additive. */
export type Reconciliation={metric:Measure;year:number;detail:number;overhead:number;lo:number;matrix?:number;difference?:number;status:'matched'|'different'|'missing-matrix'|'mixed-period'};
const key=(metric:string,year:number)=>metric+'|'+year;
export function reconcileUoImport(result:ImportResult):Reconciliation[]{
 const totals=new Map<string,Reconciliation>();
 for(const fact of result.facts){
  const k=key(fact.measure,fact.period.year);
  const r=totals.get(k)??{metric:fact.measure,year:fact.period.year,detail:0,overhead:0,lo:0,status:'missing-matrix' as const};
  const isOverhead=/^UO Övergripande$/i.test(fact.area.trim());
  r.detail+=fact.value;
  if(isOverhead)r.overhead+=fact.value;else r.lo+=fact.value;
  if(fact.period.month!==undefined)r.status='mixed-period';
  totals.set(k,r);
 }
 const byMatrix=new Map<string,number>();
 for(const fact of result.matrix?.facts??[]){
  if(fact.activity!=='development'&&fact.activity!=='maintenance')continue;
  const k=key(fact.measureId,fact.year);
  byMatrix.set(k,(byMatrix.get(k)??0)+fact.value);
 }
 for(const [k,r] of totals){
  const matrix=byMatrix.get(k);
  if(matrix===undefined)continue;
  r.matrix=matrix;r.difference=matrix-r.detail;
  if(r.status!=='mixed-period')r.status=Math.abs(r.difference)<=Math.max(0.000001,Math.abs(r.detail)*0.000001)?'matched':'different';
 }
 return [...totals.values()].sort((a,b)=>a.year-b.year||a.metric.localeCompare(b.metric));
}
