import type {AnalysisProject} from '../model';
import type {CanonicalDataset,AnalysisRecord} from '../domain/canonical';
import type {GapState} from '../gaps/store';
import {approvedActivityParts,previewActivityAllocation,type ActivityAllocationRule} from '../domain/activityAllocation';

export type OverviewStatus={sources:number;approved:number;pending:number;uos:number;years:number;hasData:boolean};

/** Only imported canonical observations count. Historic demo fixtures never enter project status. */
export function projectOverviewStatus(project:AnalysisProject,canonical:CanonicalDataset,gaps:GapState):OverviewStatus{
 const sourceIds=new Set(project.datasets.filter(d=>d.source==='excel').map(d=>d.id));
 const records=canonical.records.filter(r=>r.authority==='original'&&r.source&&sourceIds.has(r.source.datasetId));
 const uos=new Set(records.filter(r=>r.scope.axis==='work').map(r=>(r.scope as Extract<AnalysisRecord['scope'],{axis:'work'}>).uoId));
 const years=new Set(records.map(r=>r.year));
 const groups=new Map<string,ActivityAllocationRule[]>();
 for(const r of records){
  if(r.granularity!=='activity-part'||r.scope.axis!=='work'||r.scope.loId||!['it_hours','business_hours'].includes(r.metric))continue;
  const key=JSON.stringify([r.source!.datasetId,r.scope.uoId,r.year]);
  const rule:ActivityAllocationRule={id:JSON.stringify({datasetId:r.source!.datasetId,uoId:r.scope.uoId,metric:r.metric,year:r.year}),datasetId:r.source!.datasetId,uoId:r.scope.uoId,metric:r.metric,year:r.year,reason:'Status för importerat budgetunderlag'};
  const list=groups.get(key)??[];
  if(!list.some(x=>x.metric===rule.metric))list.push(rule);
  groups.set(key,list);
 }
 let approved=0,pending=0;
 for(const rules of groups.values()){
  const valid=rules.map(rule=>{
   try{
    const existing=gaps.activityAllocationRules?.find(r=>r.datasetId===rule.datasetId&&r.uoId===rule.uoId&&r.metric===rule.metric&&r.year===rule.year);
    const effective=existing??rule;
    previewActivityAllocation(canonical,effective);
    const decision=gaps.activityAllocationDecisions?.find(d=>d.ruleId===effective.id);
    return {eligible:true,approved:Boolean(decision?.sharedPercentages&&approvedActivityParts(canonical,effective,decision).length)};
   }catch{return {eligible:false,approved:false}}
  });
  if(!valid.some(x=>x.eligible))continue;
  if(valid.every(x=>x.eligible&&x.approved))approved++;else pending++;
 }
 return {sources:sourceIds.size,approved,pending,uos:uos.size,years:years.size,hasData:records.length>0};
}
