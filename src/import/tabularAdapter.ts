import type {SemanticDataset,Entity} from '../domain/semantic';
import {matchEntity,validateSemantic} from '../domain/semantic';
import type {TableResult} from './tabular';
export type Resolution=Record<string,string>;
export function tableIdentityIssues(existing:SemanticDataset,result:TableResult,resolutions:Resolution={}):string[]{
 const issues:string[]=[];
 for(const f of result.facts){
  const match=matchEntity(existing.entities,f.entityKind,f.entityName);
  const key=f.entityKind+':'+f.entityName;
  if(match.status==='ambiguous'&&!resolutions[key])issues.push('AMBIGUOUS_ENTITY: '+key);
  if(match.status==='alias'&&!resolutions[key])issues.push('ALIAS_CONFIRMATION_REQUIRED: '+key);
  if(resolutions[key]&&!match.candidates.some(e=>e.id===resolutions[key]))issues.push('INVALID_RESOLUTION: '+key);
 }
 return [...new Set(issues)];
}
export function importTableFacts(existing:SemanticDataset,result:TableResult,datasetId:string,fileName:string,resolutions:Resolution={}):SemanticDataset{
 if(result.issues.some(i=>i.severity==='error'))throw new Error('Invalid table import');
 const unresolved=tableIdentityIssues(existing,result,resolutions);if(unresolved.length)throw new Error(unresolved.join('; '));
 const entities:Entity[]=existing.entities.map(e=>({...e,aliases:[...e.aliases]}));
 const observations=existing.observations.filter(o=>o.source.datasetId!==datasetId);
 for(const fact of result.facts){
  const key=fact.entityKind+':'+fact.entityName;
  const matched=matchEntity(entities,fact.entityKind,fact.entityName);
  const id=resolutions[key]??(matched.status==='exact'?matched.candidates[0].id:fact.entityKind+':'+encodeURIComponent(fact.entityName.normalize('NFKC').trim()));
  if(!entities.some(e=>e.id===id))entities.push({id,kind:fact.entityKind,name:fact.entityName,aliases:[]});
  const cell=[datasetId,fact.source.sheet,fact.source.cell,fact.measureId].map(encodeURIComponent).join('|');
  observations.push({id:cell,entityId:id,measureId:fact.measureId,value:fact.value,period:{year:fact.year},planningVersion:String(fact.year),scenario:'reported',source:{datasetId,fileName,sheet:fact.source.sheet,cell:fact.source.cell},kind:'detail',quality:'reported'});
 }
 const next={...existing,entities,observations};
 const errors=validateSemantic(next);if(errors.length)throw new Error(errors.join(', '));return next;
}
