import type {SemanticDataset} from '../domain/semantic';
import type {GapState} from './store';
import {calculateDistribution,type DistributionPreview} from './distribution';
export type ApprovedDistribution={ruleId:string;fingerprint:string;approvedAt:string;items:{key:string;entityId:string;value:number}[]};
export type EvaluatedApproval={approval:ApprovedDistribution;status:'current'|'stale'|'invalid';preview?:DistributionPreview;reason?:string};
export function evaluateApprovals(data:SemanticDataset,state:GapState):EvaluatedApproval[]{
 return (state.approvals??[]).map(approval=>{
  const rule=(state.rules??[]).find(r=>r.id===approval.ruleId),req=state.requirements.find(r=>r.id===rule?.requirementId);
  if(!rule||!req)return {approval,status:'invalid',reason:'Regeln eller informationskravet saknas'};
  try{
   const preview=calculateDistribution(data,req,rule,state.resolutions);
   const same=preview.fingerprint===approval.fingerprint&&preview.items.length===approval.items.length&&preview.items.every((item,i)=>item.key===approval.items[i].key&&item.entityId===approval.items[i].entityId&&item.value===approval.items[i].value);
   return {approval,status:same?'current':'stale',preview,reason:same?undefined:'Källvärden, vikter eller mål har ändrats'};
  }catch(e){return {approval,status:'invalid',reason:e instanceof Error?e.message:String(e)}}
 });
}
export function approvalFromPreview(preview:DistributionPreview):ApprovedDistribution{
 return {ruleId:preview.ruleId,fingerprint:preview.fingerprint,approvedAt:new Date().toISOString(),items:preview.items.map(i=>({key:i.key,entityId:i.entityId,value:i.value}))};
}
export function approvedRows(data:SemanticDataset,state:GapState,options:{measureId?:string;year?:number;activity?:string}={}){
 const accepted=evaluateApprovals(data,state).filter(x=>x.status==='current');
 return accepted.flatMap(({approval})=>{
  const rule=(state.rules??[]).find(r=>r.id===approval.ruleId);
  const requirement=state.requirements.find(r=>r.id===rule?.requirementId);
  if(!rule||!requirement||options.measureId&&requirement.measureId!==options.measureId||options.year!==undefined&&rule.year!==options.year||options.activity&&rule.activity!==options.activity)return [];
  return approval.items.map(item=>({ruleId:rule.id,requirementId:requirement.id,measureId:requirement.measureId,activity:rule.activity,year:rule.year,entityId:item.entityId,entityName:data.entities.find(e=>e.id===item.entityId)?.name??item.entityId,value:item.value,approvedAt:approval.approvedAt}));
 });
}
