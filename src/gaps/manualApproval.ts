import type {SemanticDataset} from '../domain/semantic';
import type {GapState} from './store';
import {gapKey} from './model';
import {approvedRows} from './approved';
export type ManualApproval={key:string;resolutionUpdatedAt:string;approvedAt:string};
export type ManualReview={approval:ManualApproval;status:'current'|'stale'|'invalid';reason?:string};
export function reviewManualApprovals(data:SemanticDataset,state:GapState):ManualReview[]{
 const resolved=new Map(state.resolutions.map(r=>[r.key,r]));
 const approvedDistributionKeys=new Set(approvedRows(data,state).map(r=>gapKey(r.requirementId,r.entityId,r.year,r.activity)));
 return (state.manualApprovals??[]).map(approval=>{
  const r=resolved.get(approval.key);if(!r||r.status!=='manual'||r.value===undefined||!Number.isFinite(r.value))return {approval,status:'invalid',reason:'Manuell komplettering saknas eller är ogiltig'};
  const requirement=state.requirements.find(q=>q.id===JSON.parse(approval.key)[0]);
  if(!requirement)return {approval,status:'invalid',reason:'Informationskravet saknas'};
  const [,,year,activity]=JSON.parse(approval.key) as [string,string,number,string];
  const entityId=JSON.parse(approval.key)[1] as string;
  if(!data.entities.some(e=>e.id===entityId&&e.kind===requirement.entityKind)||!requirement.years.includes(year)||!requirement.activities.includes(activity))return {approval,status:'invalid',reason:'Objekt eller kravomfattning har ändrats'};
  if(data.observations.some(o=>o.entityId===entityId&&o.measureId===requirement.measureId&&o.period.year===year&&(o.activity??'')===activity)||approvedDistributionKeys.has(approval.key))return {approval,status:'invalid',reason:'Överlappande originalvärde eller godkänd fördelning'};
  if(approval.resolutionUpdatedAt!==r.updatedAt)return {approval,status:'stale',reason:'Kompletteringen har ändrats'};
  return {approval,status:'current'};
 });
}
export function manualApprovedRows(data:SemanticDataset,state:GapState,options:{measureId?:string;year?:number;activity?:string}={}){
 const accepted=reviewManualApprovals(data,state).filter(x=>x.status==='current');
 const overlaps=new Map<string,number>();
 const rows=accepted.flatMap(({approval})=>{
  const [requirementId,entityId,year,activity]=JSON.parse(approval.key) as [string,string,number,string],req=state.requirements.find(r=>r.id===requirementId),resolution=state.resolutions.find(r=>r.key===approval.key);
  if(!req||!resolution||resolution.value===undefined||options.measureId&&req.measureId!==options.measureId||options.year!==undefined&&year!==options.year||options.activity&&activity!==options.activity)return [];
  const identity=JSON.stringify([req.measureId,entityId,year,activity]);overlaps.set(identity,(overlaps.get(identity)??0)+1);
  return [{identity,requirementId,entityId,entityName:data.entities.find(e=>e.id===entityId)?.name??entityId,year,activity,measureId:req.measureId,value:resolution.value,approvedAt:approval.approvedAt}];
 });
 return rows.filter(r=>overlaps.get(r.identity)===1);
}
