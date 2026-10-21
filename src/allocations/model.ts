export type Basis='manual'|'business_hours'|'it_hours'|'fte'|'headcount';
export type Origin='uo-proposal'|'lo-override';
export interface AllocationDimension {id:string;name:string;categories:{id:string;name:string}[];basis:Basis}
export interface AllocationRule {dimensionId:string;entityId:string;year:number;percentages:Record<string,number>;origin:Origin;source?:string}
export interface Allocations {schemaVersion:1;dimensions:AllocationDimension[];rules:AllocationRule[]}
export const emptyAllocations=():Allocations=>({schemaVersion:1,dimensions:[],rules:[]});
export const allocationKey=(dimensionId:string,entityId:string,year:number)=>[dimensionId,entityId,year].join('|');
export function validateAllocation(a:Allocations):string[]{
 const issues:string[]=[];
 if(a.schemaVersion!==1)issues.push('UNSUPPORTED_SCHEMA');
 if(new Set(a.dimensions.map(d=>d.id)).size!==a.dimensions.length)issues.push('DUPLICATE_DIMENSION');
 for(const d of a.dimensions){if(!d.name.trim()||d.categories.length===0)issues.push('INVALID_DIMENSION');
 if(new Set(d.categories.map(c=>c.id)).size!==d.categories.length||d.categories.some(c=>!c.name.trim()))issues.push('DUPLICATE_OR_EMPTY_CATEGORY')}
 const keys=new Set<string>();
 for(const r of a.rules){const key=allocationKey(r.dimensionId,r.entityId,r.year);if(keys.has(key))issues.push('DUPLICATE_RULE');keys.add(key);
 const dimension=a.dimensions.find(d=>d.id===r.dimensionId);if(!dimension){issues.push('UNKNOWN_DIMENSION');continue}
 if(!Number.isInteger(r.year)||r.year<2000||r.year>2100||!r.entityId)issues.push('INVALID_SCOPE');
 if(Object.keys(r.percentages).some(c=>!dimension.categories.some(x=>x.id===c)))issues.push('UNKNOWN_CATEGORY');
 if(Object.values(r.percentages).some(v=>!Number.isFinite(v)||v<0||v>100))issues.push('INVALID_PERCENT');
 if(Object.values(r.percentages).reduce((s,v)=>s+v,0)>100.00001)issues.push('OVERALLOCATED');
 }
 return [...new Set(issues)];
}
export function createDimension(a:Allocations,name:string,categories:string[],basis:Basis):Allocations{
 if(!name.trim()||categories.length===0||categories.some(c=>!c.trim())||new Set(categories.map(c=>c.trim().toLocaleLowerCase('sv'))).size!==categories.length)throw new Error('Invalid dimension categories');
 const id=crypto.randomUUID();return {...a,dimensions:[...a.dimensions,{id,name:name.trim(),basis,categories:categories.map(c=>({id:crypto.randomUUID(),name:c.trim()}))}]};
}
export function setAllocation(a:Allocations,rule:AllocationRule):Allocations{
 const next={...a,rules:[...a.rules.filter(r=>allocationKey(r.dimensionId,r.entityId,r.year)!==allocationKey(rule.dimensionId,rule.entityId,rule.year)),rule]};
 const errors=validateAllocation(next);if(errors.length)throw new Error(errors.join(', '));return next;
}
export function effectiveAllocation(a:Allocations,dimensionId:string,uoId:string,loId:string|undefined,year:number){
 const dimension=a.dimensions.find(d=>d.id===dimensionId);if(!dimension)throw new Error('Unknown dimension');
 const override=loId?a.rules.find(r=>r.dimensionId===dimensionId&&r.entityId===loId&&r.year===year):undefined;
 const proposal=a.rules.find(r=>r.dimensionId===dimensionId&&r.entityId===uoId&&r.year===year);
 const rule=override??proposal;const pct=rule?.percentages??{};
 const values=dimension.categories.map(c=>({id:c.id,name:c.name,percent:pct[c.id]??0}));
 const unallocated=Math.max(0,100-values.reduce((sum,v)=>sum+v.percent,0));
 return {values,unallocated,origin:override?'lo-override':proposal?'uo-proposal':'none',ruleEntityId:rule?.entityId};
}
/** Weights are additive once per LO; no parent-total plus child-total double count. */
export function weightedAllocation(a:Allocations,dimensionId:string,year:number,items:{uoId:string;loId:string;weight:number}[]){
 const dimension=a.dimensions.find(d=>d.id===dimensionId);if(!dimension)throw new Error('Unknown dimension');
 const used=new Set<string>();let totalWeight=0,unallocatedWeight=0;const amounts=Object.fromEntries(dimension.categories.map(c=>[c.id,0])) as Record<string,number>;
 for(const item of items){if(used.has(item.loId))throw new Error('DUPLICATE_LO_WEIGHT');used.add(item.loId);if(!Number.isFinite(item.weight)||item.weight<0)throw new Error('INVALID_WEIGHT');
 const effective=effectiveAllocation(a,dimensionId,item.uoId,item.loId,year);totalWeight+=item.weight;unallocatedWeight+=item.weight*effective.unallocated/100;
 for(const c of effective.values)amounts[c.id]+=item.weight*c.percent/100;
 }
 return {totalWeight,amounts,unallocatedWeight,percentages:Object.fromEntries(Object.entries(amounts).map(([id,v])=>[id,totalWeight?100*v/totalWeight:0]))};
}
