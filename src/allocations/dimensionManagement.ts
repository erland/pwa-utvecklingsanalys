import type {Metric} from '../domain/canonical';
import type {OptionalAllocations,OptionalAllocationDimension} from './optionalModel';
const allMetrics:Metric[]=['it_hours','business_hours','consultant_cost','other_cost'];
export type DimensionInput={name:string;names:string[];metrics:Metric[];activities:'all'|Array<'development'|'maintenance'>};
export function dimensionChangeImpact(data:OptionalAllocations,id:string,input:DimensionInput){
 const d=data.dimensions.find(item=>item.id===id);
 if(!d)throw new Error('Fördelningstypen finns inte.');
 const oldMetrics=[...d.appliesTo.metrics].sort().join('|'),newMetrics=[...input.metrics].sort().join('|');
 const oldActivities=d.appliesTo.activities==='all'?'all':[...d.appliesTo.activities].sort().join('|');
 const newActivities=input.activities==='all'?'all':[...input.activities].sort().join('|');
 const changesScope=oldMetrics!==newMetrics||oldActivities!==newActivities;
 const removedCategories=input.names.length<d.categories.length;
 const affectedRules=data.rules.filter(rule=>rule.dimensionId===id).length;
 return {requiresConfirmation:changesScope||removedCategories,changesScope,removedCategories,affectedRules};
}
export function updateDimension(data:OptionalAllocations,id:string,input:DimensionInput,newId:()=>string,confirmReset=false):OptionalAllocations{
 const previous=data.dimensions.find(d=>d.id===id);
 if(!previous)throw new Error('Fördelningstypen finns inte.');
 const name=input.name.trim(),names=input.names.map(n=>n.trim());
 if(!name||names.length<2||names.some(n=>!n)||new Set(names.map(n=>n.toLocaleLowerCase('sv-SE'))).size!==names.length)throw new Error('Ange namn och minst två unika kategorier.');
 if(data.dimensions.some(d=>d.id!==id&&d.name.trim().toLocaleLowerCase('sv-SE')===name.toLocaleLowerCase('sv-SE')))throw new Error('Namnet används redan.');
 if(!input.metrics.length||input.metrics.some(m=>!allMetrics.includes(m))||!input.metrics.every(m=>m.endsWith('_hours'))&&!input.metrics.every(m=>m.endsWith('_cost')))throw new Error('Välj minst ett mått av samma enhet.');
 if(input.activities!=='all'&&input.activities.length===0)throw new Error('Välj minst en aktivitet.');
 const impact=dimensionChangeImpact(data,id,input);
 if(impact.requiresConfirmation&&!confirmReset)throw new Error('Ändringen påverkar fördelningsregler och kräver bekräftelse.');
 const categories=names.map((n,i)=>({id:previous.categories[i]?.id??newId(),name:n}));
 const dimension:OptionalAllocationDimension={...previous,name,categories,appliesTo:{metrics:input.metrics,activities:input.activities}};
 return {...data,dimensions:data.dimensions.map(d=>d.id===id?dimension:d),rules:impact.requiresConfirmation?data.rules.filter(r=>r.dimensionId!==id):data.rules};
}
export function deleteDimension(data:OptionalAllocations,id:string):OptionalAllocations{
 if(!data.dimensions.some(d=>d.id===id))throw new Error('Fördelningstypen finns inte.');
 return {...data,dimensions:data.dimensions.filter(d=>d.id!==id),rules:data.rules.filter(r=>r.dimensionId!==id)};
}
