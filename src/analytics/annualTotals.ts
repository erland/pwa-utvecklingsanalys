import type {Metric} from '../domain/canonical';
import type {TrendPoint} from './canonicalTrend';

export type AnnualTotal={
 year:number;value:number;unit:'h'|'SEK';unknownCount:number;staleApprovals:number;
 missingMetrics:Metric[];difference:number|null;percent:number|null;incompleteComparison:boolean
};

/** Compose only observed measure totals, and preserve missing-measure / missing-year diagnostics. */
export function annualTotals(points:TrendPoint[],selectedMetrics:readonly Metric[]):AnnualTotal[]{
 const byYear=new Map<number,TrendPoint[]>();
 for(const point of points){
  if(!selectedMetrics.includes(point.metric))continue;
  byYear.set(point.year,[...(byYear.get(point.year)??[]),point]);
 }
 const sorted=[...byYear].sort(([a],[b])=>a-b);
 return sorted.map(([year,values],index)=>{
  const previous=index?sorted[index-1]:undefined;
  const sum=values.reduce((n,p)=>n+p.value,0);
  const missingMetrics=selectedMetrics.filter(m=>!values.some(p=>p.metric===m));
  const comparable=previous&&previous[0]===year-1&&previous[1][0]?.unit===values[0]?.unit;
  const previousSum=comparable?previous[1].reduce((n,p)=>n+p.value,0):0;
  const previousMissing=comparable?selectedMetrics.filter(m=>!previous[1].some(p=>p.metric===m)):[];
  const incompleteComparison=Boolean(comparable&&(missingMetrics.length>0||previousMissing.length>0||
   values.some(p=>p.unknownCount>0||p.staleApprovals>0)||previous?.[1].some(p=>p.unknownCount>0||p.staleApprovals>0)));
  return {year,value:sum,unit:values[0]?.unit??'h',
   unknownCount:values.reduce((n,p)=>n+p.unknownCount,0),
   staleApprovals:values.reduce((n,p)=>n+p.staleApprovals,0),
   missingMetrics,difference:comparable?sum-previousSum:null,
   percent:comparable&&previousSum!==0?(sum-previousSum)/previousSum*100:null,
   incompleteComparison};
 });
}
