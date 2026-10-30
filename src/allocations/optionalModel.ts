import type {Metric} from '../domain/canonical';

/** Optional dimensions are independent of the legacy DEV-008 allocations and canonical source records. */
export type OptionalAllocationScope=
 |{kind:'uo';uoId:string}
 |{kind:'lo';uoId:string;loId:string}
 |{kind:'uo-overhead';uoId:string};
export type OptionalAllocationDimension={
 id:string;name:string;
 categories:{id:string;name:string}[];
 appliesTo:{metrics:Metric[];activities:'all'|Array<'development'|'maintenance'>};
};
export type OptionalAllocationRule={
 dimensionId:string;year:number;scope:OptionalAllocationScope;
 percentages:Record<string,number>;
};
export type OptionalAllocations={schemaVersion:2;dimensions:OptionalAllocationDimension[];rules:OptionalAllocationRule[]};
export const emptyOptionalAllocations=():OptionalAllocations=>({schemaVersion:2,dimensions:[],rules:[]});
export const optionalAllocationKey=(rule:OptionalAllocationRule)=>JSON.stringify([rule.dimensionId,rule.year,rule.scope.kind,rule.scope.uoId,rule.scope.kind==='lo'?rule.scope.loId:null]);

const metricSet=new Set<Metric>(['it_hours','business_hours','consultant_cost','other_cost']);
const hasId=(v:unknown):v is string=>typeof v==='string'&&v.trim().length>0;
export function validateOptionalAllocations(input:unknown):string[]{
 if(!input||typeof input!=='object')return ['INVALID_OPTIONAL_ALLOCATIONS'];
 const data=input as OptionalAllocations;
 if(data.schemaVersion!==2||!Array.isArray(data.dimensions)||!Array.isArray(data.rules))return ['INVALID_OPTIONAL_VERSION'];
 const issues:string[]=[];
 const dimensions=new Map<string,OptionalAllocationDimension>();
 const names=new Set<string>();
 for(const d of data.dimensions){
  if(!d||!hasId(d.id)||!hasId(d.name)||!Array.isArray(d.categories)||d.categories.length<2||!d.appliesTo){issues.push('INVALID_DIMENSION');continue}
  if(dimensions.has(d.id)||names.has(d.name.trim().toLocaleLowerCase('sv-SE')))issues.push('DUPLICATE_DIMENSION');
  dimensions.set(d.id,d);names.add(d.name.trim().toLocaleLowerCase('sv-SE'));
  const ids=new Set<string>(),categoryNames=new Set<string>();
  for(const c of d.categories){
   if(!c||!hasId(c.id)||!hasId(c.name)){issues.push('INVALID_CATEGORY');continue}
   if(ids.has(c.id)||categoryNames.has(c.name.trim().toLocaleLowerCase('sv-SE')))issues.push('DUPLICATE_CATEGORY');
   ids.add(c.id);categoryNames.add(c.name.trim().toLocaleLowerCase('sv-SE'));
  }
  const {metrics,activities}=d.appliesTo;
  if(!Array.isArray(metrics)||!metrics.length||metrics.some(m=>!metricSet.has(m))||new Set(metrics).size!==metrics.length)issues.push('INVALID_METRICS');
  else if(!metrics.every(m=>m.endsWith('_hours'))&&!metrics.every(m=>m.endsWith('_cost')))issues.push('MIXED_UNITS');
  if(activities!=='all'&&(!Array.isArray(activities)||!activities.length||activities.some(a=>a!=='development'&&a!=='maintenance')||new Set(activities).size!==activities.length))issues.push('INVALID_ACTIVITIES');
 }
 const keys=new Set<string>();
 for(const rule of data.rules){
  if(!rule||!hasId(rule.dimensionId)||!Number.isInteger(rule.year)||rule.year<2000||rule.year>2100||!rule.scope||typeof rule.scope!=='object'){issues.push('INVALID_RULE');continue}
  const {scope}=rule;
  if(!hasId(scope.uoId)||!['uo','lo','uo-overhead'].includes(scope.kind)||scope.kind==='lo'&&!hasId(scope.loId)||scope.kind!=='lo'&&'loId' in scope)issues.push('INVALID_SCOPE');
  const key=optionalAllocationKey(rule);
  if(keys.has(key))issues.push('DUPLICATE_RULE');
  keys.add(key);
  const dimension=dimensions.get(rule.dimensionId);
  if(!dimension){issues.push('UNKNOWN_DIMENSION');continue}
  if(!rule.percentages||typeof rule.percentages!=='object'||Array.isArray(rule.percentages)){issues.push('INVALID_PERCENT');continue}
  const entries=Object.entries(rule.percentages);
  if(entries.some(([id,value])=>!dimension.categories.some(c=>c.id===id)||!Number.isFinite(value)||value<0||value>100))issues.push('INVALID_PERCENT');
  if(entries.reduce((sum,[,v])=>sum+v,0)>100.00001)issues.push('OVERALLOCATED');
 }
 return [...new Set(issues)];
}
export function parseOptionalAllocations(input:unknown):OptionalAllocations{
 const issues=validateOptionalAllocations(input);
 if(issues.length)throw new Error(issues.join(','));
 return input as OptionalAllocations;
}
/** A missing optional section is not a migration of legacy rules. */
export function readOptionalAllocations(input:OptionalAllocations|undefined):OptionalAllocations{
 return input?parseOptionalAllocations(input):emptyOptionalAllocations();
}
