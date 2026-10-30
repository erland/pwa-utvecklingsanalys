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
