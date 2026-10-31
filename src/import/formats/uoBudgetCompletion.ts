import type {AllocationPreview} from '../../domain/activityAllocation';

/** A UO budget's development and maintenance totals are immutable; only LO proportions vary. */
export type LoDevelopmentOverride={loId:string;developmentPercent:number};
/** Immutable imported split for an LO. Values are hours rather than rounded percentages. */
export type LockedLoActivity={loId:string;development:number;maintenance:number};

/** Rebalance non-edited LOs in proportion to their remaining capacity.
 * An overridden LO keeps its requested share. All hours are allocated exactly,
 * including the final floating point remainder, without changing any original totals.
 */
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
 const fixed=all.filter(item=>edits.has(item.loId)||locks.has(item.loId));
 const free=all.filter(item=>!edits.has(item.loId)&&!locks.has(item.loId));
 const allocations=new Map<string,number>();
 let fixedTotal=0;
 for(const item of fixed){
  const value=locks.get(item.loId)?.development??item.total*edits.get(item.loId)!/100;
  allocations.set(item.loId,value);fixedTotal+=value;
 }
 let remaining=desired-fixedTotal;
 const remainingCapacity=free.reduce((sum,item)=>sum+item.total,0);
 if(remaining< -tolerance||remaining>remainingCapacity+tolerance)throw new Error('INFEASIBLE_LO_DISTRIBUTION');
 remaining=Math.max(0,Math.min(remainingCapacity,remaining));
 if(!free.length){
  if(Math.abs(desired-fixedTotal)>tolerance)throw new Error('INFEASIBLE_LO_DISTRIBUTION');
 }else{
  // Redistribute by remaining unallocated capacity, rather than percentage points.
  // Original proportions form the initial weights; zero weights fall back to LO hours.
  const weights=free.map(item=>Math.max(0,item.development));
  const weighted=weights.reduce((sum,value)=>sum+value,0);
  const totalWeight=weighted>0?weighted:remainingCapacity;
  let distributed=0;
  free.forEach((item,index)=>{
   const fraction=totalWeight===0?0:(weighted>0?weights[index]:item.total)/totalWeight;
   const amount=index===free.length-1?remaining-distributed:remaining*fraction;
   allocations.set(item.loId,amount);distributed+=amount;
  });
  // If weighted proportions exceed the capacity of an LO, distribute the excess to others.
  let spill=0;
  for(const item of free){
   const n=allocations.get(item.loId)!;
   if(n>item.total){spill+=n-item.total;allocations.set(item.loId,item.total)}
  }
  for(const item of free){
   if(spill<=tolerance)break;
   const room=item.total-allocations.get(item.loId)!;
   const transfer=Math.min(room,spill);
   allocations.set(item.loId,allocations.get(item.loId)!+transfer);spill-=transfer;
  }
  if(spill>tolerance)throw new Error('INFEASIBLE_LO_DISTRIBUTION');
 }
 const items=all.map(item=>{
  const development=allocations.get(item.loId)!;
  const maintenance=item.total-development;
  if(development< -tolerance||maintenance< -tolerance)throw new Error('INFEASIBLE_LO_DISTRIBUTION');
  return {...item,development,maintenance};
 });
 if(Math.abs(items.reduce((sum,item)=>sum+item.development,0)-desired)>tolerance)throw new Error('UO_LO_TOTAL_MISMATCH');
 return {...preview,items};
}
