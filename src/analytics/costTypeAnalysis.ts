import {analyzeCanonical,type CanonicalAnalysisQuery} from './canonicalQuery';
import {canonicalTrend} from './canonicalTrend';
import type {CanonicalDataset,Metric} from '../domain/canonical';
import type {GapState} from '../gaps/store';

export const costTypes=[{metric:'consultant_cost' as const,label:'Produktkonsulter'},{metric:'other_cost' as const,label:'Övriga omkostnader'}];
export type CostTypeSummary={metric:Metric;label:string;value:number};
export function costTypeSummary(data:CanonicalDataset,state:GapState,query:CanonicalAnalysisQuery):CostTypeSummary[]{
 return costTypes.map(({metric,label})=>({metric,label,value:analyzeCanonical(data,state,{...query,metrics:[metric],activity:'all'}).total}));
}
export function costTypeYears(data:CanonicalDataset,state:GapState,query:CanonicalAnalysisQuery){
 const points=canonicalTrend(data,state,{...query,metrics:costTypes.map(x=>x.metric),activity:'all',year:undefined});
 const years=[...new Set(points.map(p=>p.year))].sort((a,b)=>a-b);
 return years.map(year=>{
  const values=costTypes.map(type=>points.find(p=>p.year===year&&p.metric===type.metric)?.value??null);
  return {year,values,total:values.every(v=>v===null)?null:values.reduce<number>((sum,value)=>sum+(value??0),0)};
 });
}
