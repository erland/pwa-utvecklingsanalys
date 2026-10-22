import {analyze,type Query,type Result} from './query';
import type {SemanticDataset} from '../domain/semantic';
export type YearSeries={years:number[];rows:{key:string;label:string;values:number[]}[];totals:number[];unit:Result['unit']};
export function analyzeYears(data:SemanticDataset,query:Query):YearSeries{
 const measure=data.measures.find(m=>m.id===query.measureId);
 if(!measure||measure.aggregation!=='sum')throw new Error('Non-additive measure requires a dedicated query');
 const years=[...new Set(data.observations.filter(o=>o.measureId===query.measureId).map(o=>o.period.year))].sort((a,b)=>a-b);
 const byKey=new Map<string,{key:string;label:string;values:number[]}>();
 const totals:number[]=[];let unit:Result['unit']='h';
 years.forEach((year,index)=>{
  const result=analyze(data,{...query,year});unit=result.unit;totals.push(result.total);
  for(const row of result.rows){let series=byKey.get(row.key);if(!series){series={key:row.key,label:row.label,values:years.map(()=>0)};byKey.set(row.key,series)}series.values[index]=row.value;}
 });
 return {years,rows:[...byKey.values()].sort((a,b)=>a.label.localeCompare(b.label,'sv')),totals,unit};
}
