import type {SemanticDataset,Observation} from '../domain/semantic';
import type {Allocations} from '../allocations/model';
import {effectiveAllocation} from '../allocations/model';
export type Issue={id:string;severity:'error'|'warning'|'info';code:string;description:string;entityId?:string;year?:number};
export interface Scenario {id:string;name:string;baseVersion:string;status:'draft'|'approved';adjustments:{observationId:string;value:number;reason:string}[];approvedAt?:string}
export interface PlanningState {schemaVersion:1;scenarios:Scenario[]}
export const emptyPlanning=():PlanningState=>({schemaVersion:1,scenarios:[]});
export function qualityIssues(data:SemanticDataset,allocations:Allocations,year:number):Issue[]{
 const issues:Issue[]=[];
 const entityIds=new Set(data.entities.map(e=>e.id));
 for(const o of data.observations.filter(o=>o.period.year===year)){
  if(!entityIds.has(o.entityId))issues.push({id:'missing:'+o.id,severity:'error',code:'UNKNOWN_ENTITY',description:'Observationen saknar känt objekt',entityId:o.entityId,year});
  if(!o.source.fileName||!o.source.sheet||!o.source.cell)issues.push({id:'source:'+o.id,severity:'error',code:'MISSING_SOURCE',description:'Källspårning saknas',entityId:o.entityId,year});
 }
 for(const uo of data.entities.filter(e=>e.kind==='uo')){
  const lo=data.entities.filter(e=>e.kind==='lo'&&e.parentId===uo.id);
  if(!lo.length)issues.push({id:'lo:'+uo.id+':'+year,severity:'warning',code:'NO_LO',description:'UO saknar registrerade LO',entityId:uo.id,year});
  for(const dimension of allocations.dimensions)for(const item of lo){
   const a=effectiveAllocation(allocations,dimension.id,uo.id,item.id,year);
   if(a.unallocated>0.00001)issues.push({id:['unallocated',dimension.id,item.id,year].join(':'),severity:'warning',code:'UNALLOCATED',description:dimension.name+': '+a.unallocated.toLocaleString('sv-SE')+' % ofördelat',entityId:item.id,year});
  }
 }
 const seen=new Set<string>();
 for(const o of data.observations.filter(o=>o.period.year===year&&o.kind==='detail')){
  const key=[o.source.datasetId,o.source.sheet,o.source.cell,o.measureId].join('|');
  if(seen.has(key))issues.push({id:'duplicate:'+o.id,severity:'warning',code:'DUPLICATE_SOURCE',description:'Källcell förekommer flera gånger',entityId:o.entityId,year});
  seen.add(key);
 }
 return issues;
}
export function newScenario(state:PlanningState,name:string,baseVersion:string):PlanningState{
 if(!name.trim())throw new Error('SCENARIO_NAME_REQUIRED');
 return {...state,scenarios:[...state.scenarios,{id:crypto.randomUUID(),name:name.trim(),baseVersion,status:'draft',adjustments:[]}]};
}
export function adjustScenario(state:PlanningState,id:string,o:Observation,value:number,reason:string):PlanningState{
 if(!Number.isFinite(value)||!reason.trim())throw new Error('INVALID_ADJUSTMENT');
 return {...state,scenarios:state.scenarios.map(s=>{if(s.id!==id)return s;if(s.status!=='draft')throw new Error('APPROVED_SCENARIO_IMMUTABLE');return {...s,adjustments:[...s.adjustments.filter(a=>a.observationId!==o.id),{observationId:o.id,value,reason:reason.trim()}]}})};
}
export function approveScenario(state:PlanningState,id:string,data:SemanticDataset,issues:Issue[]):PlanningState{
 if(issues.some(i=>i.severity==='error'))throw new Error('BLOCKING_DATA_QUALITY');
 return {...state,scenarios:state.scenarios.map(s=>{if(s.id!==id)return s;if(s.status==='approved')return s;
 if(s.adjustments.some(a=>!data.observations.some(o=>o.id===a.observationId)))throw new Error('MISSING_OBSERVATION');
 return {...s,status:'approved',approvedAt:new Date().toISOString()}})};
}
export function scenarioCompare(data:SemanticDataset,baseVersion:string,scenario:Scenario,measureId:string,year:number){
 const originals=data.observations.filter(o=>o.planningVersion===baseVersion&&o.measureId===measureId&&o.period.year===year&&o.kind==='detail');
 if(data.measures.find(m=>m.id===measureId)?.aggregation!=='sum')throw new Error('NON_ADDITIVE_COMPARISON');
 const seen=new Set<string>();let baseline=0,adjusted=0;
 for(const o of originals){
  const source=[o.source.datasetId,o.source.sheet,o.source.cell,o.measureId].join('|');if(seen.has(source))continue;seen.add(source);
  baseline+=o.value;adjusted+=scenario.adjustments.find(a=>a.observationId===o.id)?.value??o.value;
 }
 return {baseline,scenario:adjusted,difference:adjusted-baseline,sourceCount:seen.size};
}

export function compareVersions(data:SemanticDataset,first:string,second:string,measureId:string,year:number){
 if(data.measures.find(m=>m.id===measureId)?.aggregation!=='sum')throw new Error('NON_ADDITIVE_COMPARISON');
 const sum=(version:string)=>{const used=new Set<string>();let total=0,count=0;
  for(const o of data.observations){if(o.planningVersion!==version||o.measureId!==measureId||o.period.year!==year||o.kind!=='detail')continue;
   const key=[o.source.datasetId,o.source.sheet,o.source.cell,o.measureId].join('|');if(used.has(key))continue;used.add(key);total+=o.value;count++;
  }
  return {total,count};
 };
 const a=sum(first),b=sum(second);return {first:a.total,second:b.total,difference:b.total-a.total,firstCount:a.count,secondCount:b.count};
}
