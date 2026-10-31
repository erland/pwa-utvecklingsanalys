import type {OptionalAllocations,OptionalAllocationScope} from './optionalModel';
import {parseOptionalAllocations} from './optionalModel';

/** A bulk initialization writes one proposal per UO; child scopes inherit it.
 * Annual rules are not touched when initializing the shared all-years default.
 */
export function bulkInitializeUos(config:OptionalAllocations,dimensionId:string,year:number,uoIds:readonly string[],selectedCategoryId:string):OptionalAllocations{
 const dimension=config.dimensions.find(d=>d.id===dimensionId);
 if(!dimension)throw new Error('UNKNOWN_DIMENSION');
 if(!dimension.categories.some(c=>c.id===selectedCategoryId))throw new Error('UNKNOWN_CATEGORY');
 if(!Number.isInteger(year)||year!==0&&(year<2000||year>2100))throw new Error('INVALID_YEAR');
 const ids=[...new Set(uoIds.filter(Boolean))];
 if(!ids.length)throw new Error('NO_UOS');
 const keys=new Set(ids);
 const percentages=Object.fromEntries(dimension.categories.map(c=>[c.id,c.id===selectedCategoryId?100:0]));
 const rules=ids.map(uoId=>({dimensionId,year,scope:{kind:'uo',uoId} as OptionalAllocationScope,percentages:{...percentages}}));
 // Remove explicit children in the selected scope so the new UO baseline takes effect,
 // but leave every other year, dimension and UO untouched.
 const next:OptionalAllocations={...config,rules:[
  ...config.rules.filter(r=>!(r.dimensionId===dimensionId&&r.year===year&&keys.has(r.scope.uoId))),
  ...rules
 ]};
 return parseOptionalAllocations(next);
}

/** Preview counts all rules replaced by an all-years operation, including prior annual exceptions. */
export function previewBulkChange(config:OptionalAllocations,dimensionId:string,year:number,uoIds:readonly string[]){
 const ids=new Set(uoIds);
 const affected=config.rules.filter(r=>r.dimensionId===dimensionId&&(year===0||r.year===year)&&ids.has(r.scope.uoId));
 return {uos:ids.size,removedRules:affected.length,loRules:affected.filter(r=>r.scope.kind==='lo').length,overheadRules:affected.filter(r=>r.scope.kind==='uo-overhead').length,
  annualExceptions:0};
}
export function bulkSetPercentages(config:OptionalAllocations,dimensionId:string,year:number,uoIds:readonly string[],percentages:Record<string,number>):OptionalAllocations{
 const dimension=config.dimensions.find(d=>d.id===dimensionId);
 if(!dimension)throw new Error('UNKNOWN_DIMENSION');
 if(!Number.isInteger(year)||year!==0&&(year<2000||year>2100))throw new Error('INVALID_YEAR');
 const ids=[...new Set(uoIds.filter(Boolean))];if(!ids.length)throw new Error('NO_UOS');
 if(Object.keys(percentages).some(id=>!dimension.categories.some(c=>c.id===id))||dimension.categories.some(c=>!Number.isFinite(percentages[c.id])||percentages[c.id]<0||percentages[c.id]>100)||Math.abs(dimension.categories.reduce((n,c)=>n+percentages[c.id],0)-100)>0.00001)throw new Error('INVALID_PERCENTAGES');
 const keys=new Set(ids);
 return parseOptionalAllocations({...config,rules:[
  ...config.rules.filter(r=>!(r.dimensionId===dimensionId&&(year===0||r.year===year)&&keys.has(r.scope.uoId))),
  ...ids.map(uoId=>({dimensionId,year,scope:{kind:'uo' as const,uoId},percentages:{...percentages}}))
 ]});
}
export function bulkClearPercentages(config:OptionalAllocations,dimensionId:string,year:number,uoIds:readonly string[]):OptionalAllocations{
 if(!config.dimensions.some(d=>d.id===dimensionId))throw new Error('UNKNOWN_DIMENSION');
 if(!Number.isInteger(year)||year!==0&&(year<2000||year>2100))throw new Error('INVALID_YEAR');
 const keys=new Set(uoIds);
 return parseOptionalAllocations({...config,rules:config.rules.filter(r=>!(r.dimensionId===dimensionId&&(year===0||r.year===year)&&keys.has(r.scope.uoId)))});
}
