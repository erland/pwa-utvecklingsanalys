/** Versioned semantic contract. Original observations are immutable. */
export type EntityKind='uo'|'lo'|'process'|'department'|'organization';
export interface Entity {id:string;kind:EntityKind;name:string;aliases:string[];parentId?:string}
export type Unit='h'|'SEK'|'people'|'FTE'|'ratio';
export type Aggregation='sum'|'snapshot'|'weighted-ratio'|'distinct-reach';
export interface Measure {id:string;label:string;unit:Unit;aggregation:Aggregation;description:string}
export interface SourceRef {datasetId:string;fileName:string;sheet:string;cell:string}
export interface Observation {id:string;entityId:string;measureId:string;value:number;period:{year:number;month?:number};planningVersion:string;scenario:string;source:SourceRef;kind:'detail'|'subtotal'|'subset';quality:'reported'|'estimated';}
export interface Relation {id:string;type:'contains'|'performs'|'supports'|'enables';fromId:string;toId:string;validFrom:string;validTo?:string;source?:SourceRef}
export interface SemanticDataset {schemaVersion:1;entities:Entity[];measures:Measure[];observations:Observation[];relations:Relation[]}
export const DEFAULT_MEASURES:Measure[]=[
 {id:'it_hours',label:'IT-timmar',unit:'h',aggregation:'sum',description:'Tid nedlagd eller planerad för IT'},
 {id:'business_hours',label:'Verksamhetstimmar',unit:'h',aggregation:'sum',description:'Verksamhetstid'},
 {id:'consultant_cost',label:'Produktkonsulter',unit:'SEK',aggregation:'sum',description:'Kostnad för produktkonsulter'},
 {id:'other_cost',label:'Övriga omkostnader',unit:'SEK',aggregation:'sum',description:'Övriga kostnader'},
 {id:'headcount',label:'Antal anställda',unit:'people',aggregation:'snapshot',description:'Antal personer vid en given tidpunkt'},
 {id:'fte',label:'Årsarbetskrafter',unit:'FTE',aggregation:'snapshot',description:'Heltidsekvivalenter'}
];
export function emptySemantic():SemanticDataset{return {schemaVersion:1,entities:[],measures:DEFAULT_MEASURES.map(m=>({...m})),observations:[],relations:[]}}
export function normalizedName(s:string){return s.trim().normalize('NFKC').toLocaleLowerCase('sv-SE').replace(/\s+/g,' ')}
export type MatchResult={status:'exact'|'alias'|'ambiguous'|'missing';candidates:Entity[]};
/** Never auto-resolve ambiguity; separate kind prevents collisions across domains. */
export function matchEntity(entities:Entity[],kind:EntityKind,name:string):MatchResult{
 const key=normalizedName(name);
 const direct=entities.filter(e=>e.kind===kind&&normalizedName(e.name)===key);
 if(direct.length>1)return {status:'ambiguous',candidates:direct};
 if(direct.length===1)return {status:'exact',candidates:direct};
 const alias=entities.filter(e=>e.kind===kind&&e.aliases.some(a=>normalizedName(a)===key));
 return {status:alias.length===1?'alias':alias.length>1?'ambiguous':'missing',candidates:alias};
}
export function validateSemantic(data:SemanticDataset):string[]{
 const issues:string[]=[];if(data.schemaVersion!==1)issues.push('UNSUPPORTED_SCHEMA');
 const unique=(ids:string[],kind:string)=>{if(new Set(ids).size!==ids.length)issues.push('DUPLICATE_'+kind+'_ID')};
 unique(data.entities.map(e=>e.id),'ENTITY');unique(data.measures.map(m=>m.id),'MEASURE');unique(data.observations.map(o=>o.id),'OBSERVATION');unique(data.relations.map(r=>r.id),'RELATION');
 const entities=new Set(data.entities.map(e=>e.id)),measures=new Map(data.measures.map(m=>[m.id,m]));
 for(const e of data.entities){if(!e.id.trim()||!e.name.trim())issues.push('EMPTY_ENTITY');if(e.parentId&&!entities.has(e.parentId))issues.push('UNKNOWN_PARENT')}
 for(const o of data.observations){
  if(!entities.has(o.entityId))issues.push('UNKNOWN_ENTITY');
  if(!measures.has(o.measureId))issues.push('UNKNOWN_MEASURE');
  if(!Number.isFinite(o.value))issues.push('INVALID_VALUE');
  if(o.period.month!==undefined&&(o.period.month<1||o.period.month>12))issues.push('INVALID_MONTH');
  if(!o.source.datasetId||!o.source.fileName||!o.source.sheet||!o.source.cell)issues.push('MISSING_SOURCE');
 }
 for(const r of data.relations){if(!entities.has(r.fromId)||!entities.has(r.toId))issues.push('UNKNOWN_RELATION_ENDPOINT');if(r.validTo&&r.validTo<r.validFrom)issues.push('INVALID_RELATION_PERIOD')}
 return [...new Set(issues)];
}
export function migrateSemantic(input:unknown):SemanticDataset{
 if(!input||typeof input!=='object'||!('schemaVersion'in input)||input.schemaVersion!==1)throw new Error('Unsupported semantic schema version');
 const v=input as SemanticDataset;
 if(!Array.isArray(v.entities)||!Array.isArray(v.measures)||!Array.isArray(v.observations)||!Array.isArray(v.relations))throw new Error('Invalid semantic dataset');
 const errors=validateSemantic(v);if(errors.length)throw new Error(errors.join(', '));return v;
}
