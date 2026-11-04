import type {AllocationPreview} from '../../domain/activityAllocation';

/** A UO budget's development and maintenance totals are immutable; only LO proportions vary. */
export type LoDevelopmentOverride={loId:string;developmentPercent:number};
/** Keep earlier explicit choices, moving the most recently edited LO to the end.
 * The last override is the active control and receives first priority. */
export function mergeLoOverrides(previous:readonly LoDevelopmentOverride[],changes:readonly LoDevelopmentOverride[]):LoDevelopmentOverride[]{
 const changed=new Set(changes.map(change=>change.loId));
 return [...previous.filter(item=>!changed.has(item.loId)),...changes.map(item=>({...item}))];
}
/** Immutable imported split for an LO. Values are hours rather than rounded percentages. */
export type LockedLoActivity={loId:string;development:number;maintenance:number};

/** Balance toward the last edited LO, preferring untouched later rows and
 * preserving earlier manual choices until necessary. Imported values never move. */
export function rebalanceUoBudgetAllocation(preview:AllocationPreview,overrides:readonly LoDevelopmentOverride[],locked:readonly LockedLoActivity[]=[]):AllocationPreview{
 const all=preview.items;
 const known=new Set(all.map(item=>item.loId));
 const edits=new Map<string,number>();
 for(const override of overrides){
  if(!known.has(override.loId))throw new Error('UNKNOWN_LO');
  if(edits.has(override.loId))throw new Error('DUPLICATE_LO_OVERRIDE');
  if(!Number.isFinite(override.developmentPercent)||override.developmentPercent<0||override.developmentPercent>100)throw new Error('INVALID_DEVELOPMENT_PERCENT');
  edits.set(override.loId,override.developmentPercent);
 }
 const locks=new Map<string,LockedLoActivity>();
 for(const entry of locked){
  if(!known.has(entry.loId))throw new Error('UNKNOWN_LOCKED_LO');
  if(locks.has(entry.loId))throw new Error('DUPLICATE_LOCKED_LO');
  if(edits.has(entry.loId))throw new Error('LOCKED_LO_OVERRIDE');
  if(!Number.isFinite(entry.development)||!Number.isFinite(entry.maintenance)||entry.development<0||entry.maintenance<0)throw new Error('INVALID_LOCKED_LO');
  locks.set(entry.loId,entry);
 }
 const desired=preview.uo.development;
 const capacity=all.reduce((sum,item)=>sum+item.total,0);
 const tolerance=Math.max(1e-8,capacity*1e-10);
 if(!Number.isFinite(desired)||desired<0||Math.abs(capacity-desired-preview.uo.maintenance)>tolerance)throw new Error('UO_LO_TOTAL_MISMATCH');
 for(const item of all){const lock=locks.get(item.loId);if(lock&&Math.abs(lock.development+lock.maintenance-item.total)>tolerance)throw new Error('LOCKED_LO_TOTAL_MISMATCH')}
 // The last edited LO is the active control. Keep its requested value and
 // imported locks exact, then compensate in untouched later LO first.
 // Earlier manual edits form the last fallback, rather than changing on every move.
 const active=overrides.at(-1)?.loId;
 // Match the Swedish alphabetical LO card order, independent of source cell order.
 const label=(id:string)=>{const part=id.startsWith('uo-overhead:')?'UO Övergripande':id.split(':').at(-1)??id;try{return decodeURIComponent(part)}catch{return part}};
 const order=new Map([...all].sort((a,b)=>label(a.loId).localeCompare(label(b.loId),'sv')).map((item,index)=>[item.loId,index]));
 const activeIndex=order.get(active??'')??-1;
 const allocations=new Map<string,number>();
 for(const item of all){
  const lock=locks.get(item.loId);
  allocations.set(item.loId,lock?lock.development:edits.has(item.loId)?item.total*edits.get(item.loId)!/100:item.development);
 }
 let remaining=desired-all.reduce((sum,item)=>sum+allocations.get(item.loId)!,0);
 const after=(item:typeof all[number])=>(order.get(item.loId)??-1)>activeIndex;
 const free=all.filter(item=>!locks.has(item.loId)&&!edits.has(item.loId));
 const priorEdits=all.filter(item=>!locks.has(item.loId)&&edits.has(item.loId)&&item.loId!==active);
 const groups=[
  free.filter(after),free.filter(item=>!after(item)),
  priorEdits.filter(after),priorEdits.filter(item=>!after(item))
 ];
 // Within a priority group, distribute in proportion to actual available
 // room; iterative clamping respects each LO's 0..100% bounds.
 for(const group of groups){
  if(Math.abs(remaining)<=tolerance)break;
  const increasing=remaining>0;
  const capacities=group.map(item=>increasing?item.total-allocations.get(item.loId)!:allocations.get(item.loId)!);
  const available=capacities.reduce((sum,n)=>sum+Math.max(0,n),0);
  if(available<=tolerance)continue;
  const quantity=Math.min(Math.abs(remaining),available);
  let distributed=0;
  group.forEach((item,index)=>{
   const capacity=Math.max(0,capacities[index]);
   const amount=index===group.length-1?quantity-distributed:quantity*capacity/available;
   const clamped=Math.min(capacity,Math.max(0,amount));
   allocations.set(item.loId,allocations.get(item.loId)!+(increasing?clamped:-clamped));
   distributed+=clamped;
  });
  remaining+=increasing?-distributed:distributed;
 }
 if(Math.abs(remaining)>tolerance)throw new Error('INFEASIBLE_LO_DISTRIBUTION');
 const items=all.map(item=>{
  const development=allocations.get(item.loId)!;
  const maintenance=item.total-development;
  if(development< -tolerance||maintenance< -tolerance)throw new Error('INFEASIBLE_LO_DISTRIBUTION');
  return {...item,development,maintenance};
 });
 if(Math.abs(items.reduce((sum,item)=>sum+item.development,0)-desired)>tolerance)throw new Error('UO_LO_TOTAL_MISMATCH');
 return {...preview,items};
}
