import {analyzeOptionalAllocation} from './optionalAnalysis';
import type {OptionalAllocations} from './optionalModel';
import type {CanonicalDataset} from '../domain/canonical';
import type {GapState} from '../gaps/store';

export function allocationTypeOverview(dataset:CanonicalDataset,gaps:GapState,config:OptionalAllocations,dimensionId:string,year:number,uoIds:readonly string[]){
 const dimension=config.dimensions.find(d=>d.id===dimensionId);
 if(!dimension)throw new Error('UNKNOWN_DIMENSION');
 const amounts=Object.fromEntries(dimension.categories.map(c=>[c.id,0])) as Record<string,number>;
 let total=0,allocated=0,missing=0,applicable=0;
 for(const uoId of uoIds){
  const result=analyzeOptionalAllocation(dataset,gaps,config,dimensionId,{year:year||undefined,uoIds:[uoId]});
  if(result.total<=0)continue;
  applicable++;total+=result.total;allocated+=result.allocated;
  if(result.unallocated>Math.max(1e-7,result.total*1e-7))missing++;
  for(const c of dimension.categories)amounts[c.id]+=result.amounts[c.id]??0;
 }
 return {total,allocated,missing,applicable,amounts,percentages:Object.fromEntries(dimension.categories.map(c=>[c.id,allocated>0?100*amounts[c.id]/allocated:0])) as Record<string,number>,unallocated:Math.max(0,total-allocated)};
}
