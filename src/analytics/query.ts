import {groupForUo,type UoGroupModel} from './groupModels';
import type {Observation,SemanticDataset,Unit,Measure} from '../domain/semantic';
export const COMPOSITE_MEASURES={all_hours:{label:'Alla timmar',unit:'h'},all_costs:{label:'Alla kostnader',unit:'SEK'}} as const;
export function measureSelection(data:SemanticDataset,id:string):{members:Measure[];unit:Unit;label:string}{
 const family=id==='all_hours'?'h':id==='all_costs'?'SEK':undefined;
 if(family){const members=data.measures.filter(m=>m.unit===family&&m.aggregation==='sum');return {members,unit:family,label:family==='h'?'Alla timmar':'Alla kostnader'};}
 const measure=data.measures.find(m=>m.id===id);
 if(!measure)throw new Error('Unknown measure');
 if(measure.aggregation!=='sum')throw new Error('Non-additive measure requires a dedicated snapshot or ratio query');
 return {members:[measure],unit:measure.unit,label:measure.label};
}
export type GroupBy='uo'|'entity'|'year'|'source'|'uo-group';
export type Query={measureId:string;year?:number;datasetIds?:string[];uoIds?:string[];groupBy:GroupBy;groupModel?:UoGroupModel};
export type Row={key:string;label:string;value:number;count:number};
export type Result={unit:Unit;rows:Row[];total:number;included:number;excluded:number};
export function analyze(data:SemanticDataset,query:Query):Result{
 const selection=measureSelection(data,query.measureId);
 const memberIds=new Set(selection.members.map(m=>m.id));
 const byId=new Map(data.entities.map(e=>[e.id,e]));
 const root=(id:string):string|undefined=>{let current=byId.get(id);const visited=new Set<string>();while(current){if(visited.has(current.id))throw new Error('Cyclic entity hierarchy');visited.add(current.id);if(current.kind==='uo')return current.id;current=current.parentId?byId.get(current.parentId):undefined;}return undefined;};
 const used=new Set<string>(),grouped=new Map<string,Row>();let excluded=0,included=0;
 for(const o of data.observations){
  if(!memberIds.has(o.measureId)||query.year!==undefined&&o.period.year!==query.year||query.datasetIds&& !query.datasetIds.includes(o.source.datasetId))continue;
  if(o.kind!=='detail'){excluded++;continue;}
  const uo=root(o.entityId);
  if(query.uoIds&&(!uo||!query.uoIds.includes(uo)))continue;
  // Distinct original source cells, not independently imported totals.
  const identity=[o.source.datasetId,o.source.sheet,o.source.cell,o.measureId].join('|');
  if(used.has(identity)){excluded++;continue;}used.add(identity);
  if(!Number.isFinite(o.value))throw new Error('Non-finite observation');
  const membership=query.groupBy==='uo-group'&&uo&&query.groupModel?groupForUo(query.groupModel,uo):undefined;
  const key=query.groupBy==='uo-group'?(membership?.id??'unassigned'):query.groupBy==='uo'?uo??'unassigned':query.groupBy==='entity'?o.entityId:query.groupBy==='year'?String(o.period.year):o.source.datasetId;
  const label=query.groupBy==='uo-group'?(membership?.name??'Ej grupperad'):query.groupBy==='year'?key:query.groupBy==='source'?o.source.fileName:byId.get(key)?.name??key;
  const row=grouped.get(key)??{key,label,value:0,count:0};
  row.value+=o.value;row.count++;grouped.set(key,row);included++;
 }
 const rows=[...grouped.values()].sort((a,b)=>b.value-a.value||a.label.localeCompare(b.label,'sv'));
 return {unit:selection.unit,rows,total:rows.reduce((sum,r)=>sum+r.value,0),included,excluded};
}
export function sourceObservations(data:SemanticDataset,query:Query):Observation[]{return data.observations.filter(o=>o.measureId===query.measureId&&(query.year===undefined||o.period.year===query.year)&&(query.datasetIds===undefined||query.datasetIds.includes(o.source.datasetId)))}
