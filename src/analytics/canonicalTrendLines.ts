import type {TrendPoint} from './canonicalTrend';
import type {Metric} from '../domain/canonical';

/** Build segments only between adjacent calendar years, preserving real gaps. */
export type LineSegment={metric:Metric;from:TrendPoint;to:TrendPoint};
export function trendSegments(points:TrendPoint[]):LineSegment[]{
 const byMetric=new Map<Metric,TrendPoint[]>();
 for(const p of points)byMetric.set(p.metric,[...(byMetric.get(p.metric)??[]),p]);
 const segments:LineSegment[]=[];
 for(const [metric,series] of byMetric){
  const sorted=[...series].sort((a,b)=>a.year-b.year);
  for(let i=1;i<sorted.length;i++)if(sorted[i].year===sorted[i-1].year+1)segments.push({metric,from:sorted[i-1],to:sorted[i]});
 }
 return segments;
}
