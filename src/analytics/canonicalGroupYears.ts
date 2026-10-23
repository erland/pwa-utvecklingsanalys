import {analyzeCanonical,type CanonicalAnalysisQuery} from './canonicalQuery';
import type {CanonicalDataset} from '../domain/canonical';
import type {GapState} from '../gaps/store';

export type GroupYearMatrix={years:number[];unit:'h'|'SEK';rows:{key:string;label:string;values:(number|null)[];total:number}[];yearTotals:number[];total:number};
/** Independent annual canonical queries preserve filters, approvals and alternative-source exclusions. */
export function canonicalGroupYears(data:CanonicalDataset,state:GapState,query:CanonicalAnalysisQuery):GroupYearMatrix{
 const years=[...new Set(data.records.map(r=>r.year))].filter(y=>query.year===undefined||y===query.year).sort((a,b)=>a-b);
 const byGroup=new Map<string,{key:string;label:string;values:(number|null)[]}>();
 const yearTotals:number[]=[];
 let unit:'h'|'SEK'='h';
 for(const [i,year] of years.entries()){
  const result=analyzeCanonical(data,state,{...query,year,groupBy:'organization'});
  unit=result.unit;yearTotals.push(result.total);
  for(const row of result.rows){
   let entry=byGroup.get(row.key);
   if(!entry){entry={key:row.key,label:row.label,values:Array<number|null>(years.length).fill(null)};byGroup.set(row.key,entry)}
   entry.values[i]=row.value;
  }
 }
 const rows=[...byGroup.values()].map(row=>({...row,total:row.values.reduce<number>((sum,v)=>sum+(v??0),0)})).sort((a,b)=>a.label.localeCompare(b.label,'sv'));
 return {years,unit,rows,yearTotals,total:yearTotals.reduce((a,b)=>a+b,0)};
}
