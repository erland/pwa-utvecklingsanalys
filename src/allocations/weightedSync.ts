import type {OptionalAllocationRule,OptionalAllocationScope,OptionalAllocations} from './optionalModel';
import {effectiveOptionalRule} from './optionalAnalysis';
import {optionalAllocationKey} from './optionalModel';

export type WeightedPart={scope:Extract<OptionalAllocationScope,{kind:'lo'|'uo-overhead'}>;hours:number};
export type WeightedSummary={hours:number;percentages:Record<string,number>;allocatedHours:Record<string,number>};

/** A UO value is a weighted view of its disjoint LO and overhead parts, not a separate volume. */
export function weightedSummary(parts:readonly WeightedPart[],values:ReadonlyMap<string,Record<string,number>>,categories:readonly string[]):WeightedSummary{
 const hours=parts.reduce((sum,p)=>sum+p.hours,0);
 const allocatedHours=Object.fromEntries(categories.map(id=>[id,parts.reduce((sum,p)=>sum+p.hours*(values.get(partKey(p.scope))?.[id]??0)/100,0)]));
 const percentages=Object.fromEntries(categories.map(id=>[id,hours?100*allocatedHours[id]/hours:0]));
 return {hours,allocatedHours,percentages};
}
export const partKey=(scope:WeightedPart['scope'])=>JSON.stringify(scope);
export const percentagesFor=(config:OptionalAllocations,dimensionId:string,year:number,scope:WeightedPart['scope'],categories:readonly string[])=>{
 const p=effectiveOptionalRule(config,dimensionId,year,scope).rule?.percentages;
 return Object.fromEntries(categories.map(id=>[id,p?.[id]??0]));
};

/** Proportional shift toward 0 or 100, preserving individual differences until an endpoint is reached. */
export function shiftBinaryUo(parts:readonly WeightedPart[],values:ReadonlyMap<string,Record<string,number>>,first:string,second:string,target:number){
 if(!Number.isFinite(target)||target<0||target>100)throw new Error('INVALID_TARGET');
 const current=weightedSummary(parts,values,[first]).percentages[first];
 const fraction=target>=current?(current===100?0:(target-current)/(100-current)):(current===0?0:(current-target)/current);
 return new Map(parts.map(p=>{
  const old=values.get(partKey(p.scope))?.[first]??0;
  const updated=target>=current?old+(100-old)*fraction:old*(1-fraction);
  return [partKey(p.scope),{[first]:updated,[second]:100-updated}];
 }));
}
export function putPartRules(config:OptionalAllocations,dimensionId:string,year:number,parts:readonly WeightedPart[],values:ReadonlyMap<string,Record<string,number>>):OptionalAllocations{
 const changes:OptionalAllocationRule[]=parts.map(p=>({dimensionId,year,scope:p.scope,percentages:values.get(partKey(p.scope))??{}}));
 const keys=new Set(changes.map(optionalAllocationKey));
 return {...config,rules:[...config.rules.filter(r=>!keys.has(optionalAllocationKey(r))),...changes]};
}
