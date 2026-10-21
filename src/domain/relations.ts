import type {Relation,SemanticDataset,Observation} from './semantic';
export type RelationKind=Relation['type'];
export type RelationDraft=Omit<Relation,'id'>;
const iso=/^\d{4}-\d{2}-\d{2}$/;
export function validDate(s:string){if(!iso.test(s))return false;const d=new Date(s+'T00:00:00Z');return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===s;}
export function activeRelation(r:Relation,date:string){return r.validFrom<=date&&(!r.validTo||date<=r.validTo);}
export function checkRelation(data:SemanticDataset,draft:RelationDraft):string[]{
 const errors:string[]=[];
 const entities=new Map(data.entities.map(e=>[e.id,e]));
 if(!entities.has(draft.fromId)||!entities.has(draft.toId))errors.push('UNKNOWN_ENDPOINT');
 if(draft.fromId===draft.toId)errors.push('SELF_RELATION');
 if(!validDate(draft.validFrom)||draft.validTo&& !validDate(draft.validTo))errors.push('INVALID_DATE');
 if(draft.validTo&&draft.validTo<draft.validFrom)errors.push('INVALID_INTERVAL');
 const from=entities.get(draft.fromId)?.kind,to=entities.get(draft.toId)?.kind;
 const allowed:Record<RelationKind,string[]>={contains:['uo:lo','uo:uo-overhead','organization:department','organization:uo'],performs:['department:process'],supports:['uo:process','lo:process'],enables:['uo:process','lo:process']};
 if(from&&to&&!allowed[draft.type].includes(from+':'+to))errors.push('INVALID_RELATION_TYPES');
 return errors;
}
export function addRelation(data:SemanticDataset,draft:RelationDraft):SemanticDataset{
 const issues=checkRelation(data,draft);if(issues.length)throw new Error(issues.join(', '));
 const same=data.relations.find(r=>r.type===draft.type&&r.fromId===draft.fromId&&r.toId===draft.toId&&r.validFrom===draft.validFrom&&r.validTo===draft.validTo);
 if(same)return data;
 return {...data,relations:[...data.relations,{...draft,id:crypto.randomUUID()}]};
}
export type ReachResult={processIds:string[];supportingUoIds:string[];departmentIds:string[];processCount:number;relationCount:number;totalHours:number;sourceObservations:number};
/** Reach is set-based, and source hours are counted once per cell, independent of path multiplicity. */
export function processReach(data:SemanticDataset,year:number,selectedUos?:string[]):ReachResult{
 const date=String(year)+'-12-31';
 const byId=new Map(data.entities.map(e=>[e.id,e]));
 const permitted=new Set(selectedUos??data.entities.filter(e=>e.kind==='uo').map(e=>e.id));
 const relations=data.relations.filter(r=>activeRelation(r,date));
 const uosOf=(id:string):string|undefined=>{const seen=new Set<string>();let e=byId.get(id);while(e){if(seen.has(e.id))throw new Error('Cyclic hierarchy');seen.add(e.id);if(e.kind==='uo')return e.id;e=e.parentId?byId.get(e.parentId):undefined}return undefined;};
 const support=relations.filter(r=>r.type==='supports'||r.type==='enables').filter(r=>{const u=uosOf(r.fromId);return u&&permitted.has(u)&&byId.get(r.toId)?.kind==='process'});
 const processIds=[...new Set(support.map(r=>r.toId))],processSet=new Set(processIds);
 const supportingUoIds=[...new Set(support.map(r=>uosOf(r.fromId)!).filter(Boolean))];
 const departments=[...new Set(relations.filter(r=>r.type==='performs'&&processSet.has(r.toId)).map(r=>r.fromId))];
 const counted=new Set<string>();let totalHours=0,sourceObservations=0;
 for(const o of data.observations){
  if(o.kind!=='detail'||o.measureId!=='business_hours'||o.period.year!==year||!processSet.has(o.entityId))continue;
  const key=[o.source.datasetId,o.source.sheet,o.source.cell,o.measureId].join('|');
  if(counted.has(key))continue;counted.add(key);sourceObservations++;totalHours+=o.value;
 }
 return {processIds,supportingUoIds,departmentIds:departments,processCount:processIds.length,relationCount:support.length,totalHours,sourceObservations};
}
