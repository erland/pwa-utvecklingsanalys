import type {ImportResult} from '../import/uoBudget';
import {emptySemantic,matchEntity,validateSemantic,type Entity,type Observation,type SemanticDataset} from './semantic';
/** Canonical domain identity is deliberately scoped to entity kind and owning UO. */
export function importBudgetFacts(existing:SemanticDataset,result:ImportResult,datasetId:string,fileName:string):SemanticDataset{
 if(result.issues.some(i=>i.severity==='error'))throw new Error('Import has blocking issues');
 if(!result.uo.trim())throw new Error('UO must be confirmed before semantic import');
 const entities:Entity[]=existing.entities.map(e=>({...e,aliases:[...e.aliases]}));
 const observations=existing.observations.filter(o=>o.source.datasetId!==datasetId);
 const identifier=(s:string)=>encodeURIComponent(s.trim().normalize('NFKC'));
 const uoId='uo:'+identifier(result.uo);
 const ensure=(id:string,kind:Entity['kind'],name:string,parentId?:string)=>{
  const prev=entities.find(e=>e.id===id);
  if(prev){if(prev.kind!==kind||prev.parentId!==parentId)throw new Error('Entity identity conflict');return;}
  entities.push({id,kind,name,aliases:[],...(parentId?{parentId}:{})});
 };
 const match=matchEntity(entities,'uo',result.uo);
 if(match.status==='ambiguous')throw new Error('Ambiguous UO alias');
 if(match.status==='alias'&&match.candidates[0].id!==uoId)throw new Error('Confirm UO alias before merging');
 ensure(uoId,'uo',result.uo);
 for(const fact of result.facts){
  const areaId='lo:'+identifier(result.uo)+':'+identifier(fact.area);
  ensure(areaId,'lo',fact.area,uoId);
  const cellId=[datasetId,fact.source.sheet,fact.source.cell,fact.measure].map(identifier).join('|');
  const observation:Observation={id:cellId,entityId:areaId,measureId:fact.measure,value:fact.value,period:fact.period,planningVersion:'2027',scenario:'need',source:{datasetId,fileName,sheet:fact.source.sheet,cell:fact.source.cell},kind:'detail',quality:'reported'};
  observations.push(observation);
 }
 const updated={...emptySemantic(),...existing,entities,observations};
 const errors=validateSemantic(updated);if(errors.length)throw new Error(errors.join(', '));
 return updated;
}
