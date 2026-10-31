import {describe,it,expect} from 'vitest';
import {emptyCanonical,type AnalysisRecord,type CanonicalDataset} from './canonical';
import {previewActivityAllocation,approveBalancedActivityGroup,approvedActivityParts,type ActivityAllocationRule} from './activityAllocation';
import {rebalanceUoBudgetAllocation} from '../import/formats/uoBudgetCompletion';

const rules:ActivityAllocationRule[]=(['it_hours','business_hours'] as const).map(metric=>({
 id:'source:uo:2027:'+metric,datasetId:'source',uoId:'uo',year:2027,metric,reason:'Importerad UO-matris'
}));
function fixture():CanonicalDataset{
 const records:AnalysisRecord[]=[];
 for(const rule of rules){
  const metric=rule.metric;
  const record=(id:string,value:number,activity:AnalysisRecord['activity'],loId?:string):AnalysisRecord=>({
   id:metric+':'+id,value,metric,year:2027,activity,scope:{axis:'work',uoId:'uo',...(loId?{loId}:{})},
   granularity:loId?'total':'activity-part',authority:'original',approval:'reported',
   workloadId:metric+':'+(loId??'matrix'),source:{datasetId:'source',sheet:'Budget',cell:id}
  });
  const totalDev=metric==='it_hours'?600:500;
  records.push(record('matrix-dev',totalDev,'development'),record('matrix-maint',1000-totalDev,'maintenance'),
   record('lo1-total',400,'unknown','lo1'),record('lo2-total',300,'unknown','lo2'),record('lo3-total',300,'unknown','lo3'));
  // The two original activity observations are authoritative, never a derived approval.
  const lockDev=metric==='it_hours'?200:100;
  records.push({...record('locked-dev',lockDev,'development','lo1'),granularity:'activity-part'},
   {...record('locked-maint',400-lockDev,'maintenance','lo1'),granularity:'activity-part'});
 }
 return {...emptyCanonical(),records};
}
describe('DEV-186 mixed imported locks and editable LOs',()=>{
 it('keeps imported LO values exact and balances the other two LOs independently for each metric',()=>{
  const data=fixture(),before=JSON.stringify(data);
  const previews=rules.map(rule=>previewActivityAllocation(data,rule));
  const overrides=[{loId:'lo2',developmentPercent:70}];
  const decisions=approveBalancedActivityGroup(previews,'Kontrollerad LO-omfördelning',overrides);
  for(let index=0;index<rules.length;index++){
   const preview=rebalanceUoBudgetAllocation(previews[index],overrides,previews[index].lockedLo);
   const lockDev=index===0?200:100;
   expect(preview.items.map(i=>[i.loId,i.development,i.maintenance])).toEqual([
    ['lo1',lockDev,400-lockDev],['lo2',210,90],['lo3',190,110]
   ]);
   const parts=approvedActivityParts(data,rules[index],decisions[index]);
   expect(parts).toHaveLength(4);
   expect(parts.every(part=>part.scope.axis==='work'&&part.scope.loId!=='lo1')).toBe(true);
   const dev=parts.filter(part=>part.activity==='development').reduce((sum,part)=>sum+part.value,lockDev);
   expect(dev).toBe(index===0?600:500);
  }
  expect(JSON.stringify(data)).toBe(before);
 });
 it('rejects attempts to edit an original lock and invalidates approvals after a changed imported original',()=>{
  const data=fixture(),previews=rules.map(rule=>previewActivityAllocation(data,rule));
  expect(()=>approveBalancedActivityGroup(previews,'Ogiltig',[
   {loId:'lo1',developmentPercent:50}
  ])).toThrow('LOCKED_LO_OVERRIDE');
  const decisions=approveBalancedActivityGroup(previews,'Godkänt',[{loId:'lo2',developmentPercent:70}]);
  const reimport=fixture();
  const changed=reimport.records.find(record=>record.metric==='it_hours'&&record.id==='it_hours:locked-dev')!;
  changed.value=250;
  const remaining=reimport.records.find(record=>record.metric==='it_hours'&&record.id==='it_hours:locked-maint')!;
  remaining.value=150;
  expect(approvedActivityParts(reimport,rules[0],decisions[0])).toEqual([]);
  expect(approvedActivityParts(reimport,rules[1],decisions[1])).toHaveLength(4);
 });
});
