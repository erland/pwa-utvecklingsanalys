import {analyzeCanonical,type CanonicalAnalysisQuery} from './canonicalQuery';
import type {CanonicalDataset,Metric} from '../domain/canonical';
import type {GapState} from '../gaps/store';

/** A trend is a set of independent, year-scoped queries using the same source and organization filters. */
export type TrendPoint={year:number;metric:Metric;value:number;unit:'h'|'SEK';unknownCount:number;staleApprovals:number};
export function canonicalTrend(data:CanonicalDataset,state:GapState,query:CanonicalAnalysisQuery):TrendPoint[]{
 const years=[...new Set(data.records.map(r=>r.year))].filter(y=>query.year===undefined||query.year===y).sort((a,b)=>a-b);
 const points:TrendPoint[]=[];
 for(const year of years)for(const metric of query.metrics){
  const exists=data.records.some(r=>{
   if(r.year!==year||r.metric!==metric||r.scope.axis!==query.axis)return false;
   if(query.datasetIds?.length&&!query.datasetIds.includes(r.source?.datasetId??r.workloadId.split('|')[0]))return false;
   if(r.scope.axis!=='work')return true;
   if(query.uoIds?.length&&!query.uoIds.includes(r.scope.uoId))return false;
   if(query.loIds?.length&&(!r.scope.loId||!query.loIds.includes(r.scope.loId)))return false;
   if(query.detailUoId&&r.scope.uoId!==query.detailUoId)return false;
   if(query.detailPartId&&r.scope.loId!==query.detailPartId&&!(r.workPart==='uo-overhead'&&query.detailPartId==='uo-overhead:'+r.scope.uoId))return false;
   return true;
  });
  if(!exists)continue;
  const result=analyzeCanonical(data,state,{...query,year,metrics:[metric]});
  points.push({year,metric,value:result.total,unit:result.unit,unknownCount:result.unknownCount,staleApprovals:result.staleApprovals});
 }
 return points;
}
