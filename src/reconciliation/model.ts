import type {Observation,SemanticDataset} from '../domain/semantic';
export type Operand={scope:'self'|'children';kind:Observation['kind'];sectionId?:string;activities?:string[]};
export type ReconciliationRule={id:string;name:string;measureId:string;year:number;entityKind:'uo'|'lo';left:Operand;right:Operand;absoluteTolerance:number;relativeTolerance:number};
export type ReconciliationDecision={key:string;fingerprint:string;reason:string;updatedAt:string};
export type ReconciliationResult={key:string;ruleId:string;entityId:string;entityName:string;status:'match'|'difference'|'missing'|'accepted';left?:number;right?:number;delta?:number;relativeDifference?:number;fingerprint:string;sources:{left:string[];right:string[]};reason?:string};
const stable=(v:unknown)=>JSON.stringify(v);
export function validateReconciliationRule(rule:ReconciliationRule,data:SemanticDataset):string[]{
 const errors:string[]=[];
 if(!rule.id?.trim()||!rule.name?.trim())errors.push('Namn och ID krävs');
 const measure=data.measures.find(m=>m.id===rule.measureId);
 if(!measure||measure.aggregation!=='sum')errors.push('Måttet måste vara summerbart');
 if(!Number.isInteger(rule.year)||rule.year<2000||rule.year>2100)errors.push('Ogiltigt år');
 if(!Number.isFinite(rule.absoluteTolerance)||rule.absoluteTolerance<0||!Number.isFinite(rule.relativeTolerance)||rule.relativeTolerance<0)errors.push('Ogiltig tolerans');
 for(const operand of [rule.left,rule.right]){
  if(!operand||!['self','children'].includes(operand.scope)||!['detail','subtotal','subset'].includes(operand.kind))errors.push('Ogiltigt jämförelseurval');
  if(operand?.activities&&!Array.isArray(operand.activities))errors.push('Ogiltig aktivitetslista');
 }
 return errors;
}
export function evaluateReconciliations(data:SemanticDataset,rules:ReconciliationRule[],decisions:ReconciliationDecision[]):ReconciliationResult[]{
 const decisionsByKey=new Map(decisions.map(d=>[d.key,d]));
 return rules.flatMap(rule=>{
  if(validateReconciliationRule(rule,data).length)return [];
  return data.entities.filter(e=>e.kind===rule.entityKind).map(entity=>{
   const collect=(operand:Operand)=>{
    const ids=operand.scope==='self'?[entity.id]:data.entities.filter(e=>e.parentId===entity.id).map(e=>e.id);
    const obs=data.observations.filter(o=>ids.includes(o.entityId)&&o.measureId===rule.measureId&&o.period.year===rule.year&&o.kind===operand.kind&&(!operand.sectionId||o.sectionId===operand.sectionId)&&(!operand.activities?.length||Boolean(o.activity&&operand.activities.includes(o.activity))));
    const unique=new Map(obs.map(o=>[[o.source.datasetId,o.source.sheet,o.source.cell,o.measureId].join('|'),o]));
    return [...unique.values()].sort((a,b)=>a.id.localeCompare(b.id));
   };
   const l=collect(rule.left),r=collect(rule.right),key=stable([rule.id,entity.id,rule.year]);
   const fingerprint=stable([rule,l.map(o=>[o.id,o.value,o.entityId,o.period,o.activity]),r.map(o=>[o.id,o.value,o.entityId,o.period,o.activity])]);
   const sources={left:l.map(o=>o.source.fileName+':'+o.source.sheet+'!'+o.source.cell),right:r.map(o=>o.source.fileName+':'+o.source.sheet+'!'+o.source.cell)};
   if(!l.length||!r.length)return {key,ruleId:rule.id,entityId:entity.id,entityName:entity.name,status:'missing' as const,fingerprint,sources};
   const left=l.reduce((n,o)=>n+o.value,0),right=r.reduce((n,o)=>n+o.value,0),delta=right-left,relativeDifference=Math.abs(delta)/Math.max(Math.abs(left),Math.abs(right),Number.EPSILON);
   const matching=Math.abs(delta)<=rule.absoluteTolerance||relativeDifference<=rule.relativeTolerance;
   const decision=decisionsByKey.get(key);
   const accepted=!matching&&decision?.fingerprint===fingerprint&&Boolean(decision.reason.trim());
   return {key,ruleId:rule.id,entityId:entity.id,entityName:entity.name,status:matching?'match' as const:accepted?'accepted' as const:'difference' as const,left,right,delta,relativeDifference,fingerprint,sources,reason:accepted?decision?.reason:undefined};
  });
 });
}
