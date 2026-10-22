import type {SemanticDataset} from '../domain/semantic';
import {gapKey,type GapResolution,type InformationRequirement} from './model';
export type DistributionRule={id:string;requirementId:string;year:number;activity:string;weightMeasureId:string;uoId?:string;reason:string};
export type DistributionPreview={ruleId:string;requirementId:string;year:number;activity:string;sourceTotal:number;allocatedTotal:number;items:{key:string;entityId:string;entityName:string;weight:number;value:number}[];fingerprint:string};
const stable=(parts:string[])=>JSON.stringify(parts.sort());
export function calculateDistribution(data:SemanticDataset,requirement:InformationRequirement,rule:DistributionRule,resolutions:GapResolution[]):DistributionPreview{
 if(requirement.id!==rule.requirementId||requirement.entityKind!=='lo'||!requirement.years.includes(rule.year)||!requirement.activities.includes(rule.activity))throw new Error('RULE_REQUIREMENT_MISMATCH');
 if(!data.measures.some(m=>m.id===rule.weightMeasureId))throw new Error('UNKNOWN_WEIGHT_MEASURE');
 const roots=data.entities.filter(e=>e.kind==='uo');
 const root=rule.uoId?roots.find(e=>e.id===rule.uoId):roots.length===1?roots[0]:undefined;
 if(!root)throw new Error(rule.uoId?'UNKNOWN_UO':'UO_SELECTION_REQUIRED');
 const children=data.entities.filter(e=>e.kind==='lo'&&e.parentId===root.id);
 if(!children.length)throw new Error('NO_LO_TARGETS');
 const manual=new Set(resolutions.filter(r=>r.status==='manual'||r.status==='not-applicable').map(r=>r.key));
 const covered=new Set(data.observations.filter(o=>o.measureId===requirement.measureId&&o.period.year===rule.year&&o.activity===rule.activity).map(o=>o.entityId));
 const source=data.observations.filter(o=>o.entityId===root.id&&o.measureId===requirement.measureId&&o.activity===rule.activity&&o.period.year===rule.year&&o.kind==='subset');
 if(!source.length)throw new Error('MISSING_UO_SOURCE');
 const dedupe=new Set<string>(),sources=source.filter(o=>{const k=[o.source.datasetId,o.source.sheet,o.source.cell,o.measureId].join('|');if(dedupe.has(k))return false;dedupe.add(k);return true});
 const sourceTotal=sources.reduce((a,o)=>a+o.value,0);
 if(!Number.isFinite(sourceTotal)||sourceTotal<0)throw new Error('INVALID_SOURCE_TOTAL');
 const weights=children.map(entity=>{
  const observations=data.observations.filter(o=>o.entityId===entity.id&&o.measureId===rule.weightMeasureId&&o.period.year===rule.year&&o.kind==='detail');
  const unique=new Map(observations.map(o=>[[o.source.datasetId,o.source.sheet,o.source.cell,o.measureId].join('|'),o]));
  const weight=[...unique.values()].reduce((a,o)=>a+o.value,0);
  if(!Number.isFinite(weight)||weight<0)throw new Error('INVALID_WEIGHT');
  return {entity,weight,key:gapKey(requirement.id,entity.id,rule.year,rule.activity)};
 });
 if(weights.some(w=>manual.has(w.key)||covered.has(w.entity.id)))throw new Error('EXISTING_COMPLETION_OR_SOURCE');
 const sum=weights.reduce((a,w)=>a+w.weight,0);if(sum<=0)throw new Error('ZERO_WEIGHT_TOTAL');
 let allocated=0;
 const items=weights.map((w,i)=>{const value=i===weights.length-1?sourceTotal-allocated:sourceTotal*w.weight/sum;allocated+=value;return {key:w.key,entityId:w.entity.id,entityName:w.entity.name,weight:w.weight,value}});
 const fingerprint=stable([...(rule.uoId?['uo:'+root.id]:[]),...sources.map(o=>[o.id,o.value].join(':')),...weights.map(w=>[w.entity.id,w.weight].join(':'))]);
 return {ruleId:rule.id,requirementId:requirement.id,year:rule.year,activity:rule.activity,sourceTotal,allocatedTotal:allocated,items,fingerprint};
}
