import type {ImportResult} from '../import/uoBudget';
import {emptySemantic,matchEntity,validateSemantic,type Entity,type Observation,type SemanticDataset} from './semantic';
/** Canonical domain identity is deliberately scoped to entity kind and owning UO. */
const normalizedArea=(area:string)=>/^UO Övergripande$/i.test(area.trim());
export function importBudgetFacts(existing:SemanticDataset,result:ImportResult,datasetId:string,fileName:string,includeMatrix=false):SemanticDataset{
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
  const overhead=normalizedArea(fact.area);const areaId=(overhead?'uo-overhead:':'lo:')+identifier(result.uo)+':'+identifier(fact.area);
  ensure(areaId,overhead?'uo-overhead':'lo',fact.area,uoId);
  const cellId=[datasetId,fact.source.sheet,fact.source.cell,fact.measure].map(identifier).join('|');
  const observation:Observation={id:cellId,entityId:areaId,measureId:fact.measure,value:fact.value,period:fact.period,planningVersion:'2027',scenario:'need',source:{datasetId,fileName,sheet:fact.source.sheet,cell:fact.source.cell},kind:'detail',quality:'reported'};
  observations.push(observation);
 }
 // The optional LO activity sheet is an alternative breakdown of imported totals.
 // Require exact annual detail reconciliation before committing semantic observations.
 for(const fact of result.loActivities??[]){
  const entityId='lo:'+identifier(result.uo)+':'+identifier(fact.area);
  const matches=observations.filter(o=>o.source.datasetId===datasetId&&o.entityId===entityId&&o.measureId===fact.metric&&o.period.year===fact.year&&o.kind==='detail');
  const annual=matches.filter(o=>o.period.month===undefined);
  const monthly=matches.filter(o=>o.period.month!==undefined);
  const chosen=fact.year===2027&&monthly.length?monthly:annual.length?annual:monthly;
  const total=chosen.reduce((n,o)=>n+o.value,0);
  if(!chosen.length)throw new Error('LO_ACTIVITY_TOTAL_MISSING');
  if(Math.abs(total-fact.development-fact.maintenance)>Math.max(1e-8,total*1e-10))throw new Error('LO_ACTIVITY_TOTAL_MISMATCH');
  for(const activity of ['development','maintenance'] as const){
   const cell=activity==='development'?fact.source.developmentCell:fact.source.maintenanceCell;
   const id=[datasetId,fact.source.sheet,cell,fact.metric].map(identifier).join('|');
   observations.push({id,entityId,measureId:fact.metric,value:activity==='development'?fact.development:fact.maintenance,
    period:{year:fact.year},planningVersion:'2027',scenario:'need',source:{datasetId,fileName,sheet:fact.source.sheet,cell},
    kind:'subset',sectionId:'lo-activity',activity,quality:'reported'});
  }
 }
 if(includeMatrix&&result.matrix){
  if(result.matrix.issues.length)throw new Error('Matrix contains unreviewed import issues');
  for(const fact of result.matrix.facts){
   const cellId=[datasetId,fact.source.sheet,fact.source.cell,fact.measureId].map(identifier).join('|');
   observations.push({id:cellId,entityId:uoId,measureId:fact.measureId,value:fact.value,period:{year:fact.year},planningVersion:'2027',scenario:'need',source:{datasetId,fileName,sheet:fact.source.sheet,cell:fact.source.cell},kind:'subset',sectionId:fact.sectionId,activity:fact.activity,quality:'reported'});
  }
 }
 const updated={...emptySemantic(),...existing,entities,observations};
 const errors=validateSemantic(updated);if(errors.length)throw new Error(errors.join(', '));
 return updated;
}
