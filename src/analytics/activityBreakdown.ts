import {analyzeCanonical} from './canonicalQuery';
import type {CanonicalDataset,Metric} from '../domain/canonical';
import type {GapState} from '../gaps/store';

/** Breakdown from the same approved canonical projection as the totals. */
export type ActivitySplit={development:number;maintenance:number;unallocated:number;total:number};
export function uoActivityRows(data:CanonicalDataset,state:GapState,metrics:Metric[],year:number|undefined,uoId:string):Record<string,ActivitySplit>{
 const query={axis:'work' as const,metrics,year,detailUoId:uoId};
 const all=analyzeCanonical(data,state,{...query,activity:'all'});
 const dev=analyzeCanonical(data,state,{...query,activity:'development'});
 const maint=analyzeCanonical(data,state,{...query,activity:'maintenance'});
 const d=new Map(dev.rows.map(r=>[r.key,r.value])),m=new Map(maint.rows.map(r=>[r.key,r.value]));
 return Object.fromEntries(all.rows.map(row=>{
  const development=d.get(row.key)??0,maintenance=m.get(row.key)??0;
  // Unapproved or missing allocations are explicitly undistributed, never silently maintenance.
  return [row.key,{total:row.value,development,maintenance,unallocated:Math.max(0,row.value-development-maintenance)}];
 }));
}
export function addActivitySplits(splits:readonly ActivitySplit[]):ActivitySplit{
 return splits.reduce((sum,v)=>({total:sum.total+v.total,development:sum.development+v.development,maintenance:sum.maintenance+v.maintenance,unallocated:sum.unallocated+v.unallocated}),{total:0,development:0,maintenance:0,unallocated:0});
}
