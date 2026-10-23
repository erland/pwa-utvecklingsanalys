import type {Metric} from '../domain/canonical';
import type {TrendPoint} from './canonicalTrend';

/** Compare only consecutive observed years of the same metric. Missing years never imply zero. */
export type YearComparison={metric:Metric;fromYear:number;toYear:number;from:number;to:number;difference:number;percent:number|null;unit:'h'|'SEK';incomplete:boolean};
export function compareTrend(points:TrendPoint[]):YearComparison[]{
 const grouped=new Map<Metric,TrendPoint[]>();
 for(const point of points)grouped.set(point.metric,[...(grouped.get(point.metric)??[]),point]);
 const results:YearComparison[]=[];
 for(const [metric,values] of grouped){
  const ordered=[...values].sort((a,b)=>a.year-b.year);
  for(let i=1;i<ordered.length;i++){
   const from=ordered[i-1],to=ordered[i];
   if(to.year!==from.year+1||to.unit!==from.unit)continue;
   const difference=to.value-from.value;
   results.push({metric,fromYear:from.year,toYear:to.year,from:from.value,to:to.value,difference,
    percent:from.value===0?null:difference/from.value*100,unit:to.unit,
    incomplete:from.unknownCount>0||to.unknownCount>0||from.staleApprovals>0||to.staleApprovals>0});
  }
 }
 return results.sort((a,b)=>a.toYear-b.toYear||a.metric.localeCompare(b.metric));
}
