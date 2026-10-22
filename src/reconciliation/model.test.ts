import {describe,it,expect} from 'vitest';
import {emptySemantic,type Observation} from '../domain/semantic';
import {evaluateReconciliations,type ReconciliationRule} from './model';
const rule:ReconciliationRule={id:'r',name:'Årssumma',measureId:'it_hours',year:2027,entityKind:'uo',left:{scope:'children',kind:'detail'},right:{scope:'self',kind:'subset',activities:['development','maintenance']},absoluteTolerance:0,relativeTolerance:0.01};
function fixture(){
 const d=emptySemantic();d.entities.push({id:'uo',name:'UO A',kind:'uo',aliases:[]},{id:'lo1',name:'LO 1',kind:'lo',parentId:'uo',aliases:[]},{id:'lo2',name:'LO 2',kind:'lo',parentId:'uo',aliases:[]});
 const obs=(id:string,entityId:string,value:number,kind:Observation['kind'],activity?:string):Observation=>({id,entityId,measureId:'it_hours',value,period:{year:2027},planningVersion:'2027',scenario:'need',source:{datasetId:'s',fileName:'source.xlsx',sheet:'UO',cell:id},kind,sectionId:kind==='subset'?'development-management':undefined,activity,quality:'reported'});
 d.observations.push(obs('D26','lo1',40,'detail'),obs('D32','lo2',60,'detail'),obs('D5','uo',65,'subset','development'),obs('E5','uo',35,'subset','maintenance'));
 return d;
}
describe('generic section reconciliation',()=>{
 it('matches independently selected detail and subset figures with matching totals',()=>{
  const d=fixture(),before=JSON.stringify(d),result=evaluateReconciliations(d,[rule],[]);
  expect(result).toMatchObject([{status:'match',left:100,right:100,delta:0}]);expect(JSON.stringify(d)).toBe(before);
 });
 it('detects discrepancy with evidence and requires renewal of previous exception if data changes',()=>{
  const d=fixture();d.observations[3].value=30;
  const first=evaluateReconciliations(d,[rule],[])[0];expect(first.status).toBe('difference');expect(first.delta).toBe(-5);expect(first.sources.left.length).toBe(2);
  const saved={key:first.key,fingerprint:first.fingerprint,reason:'Avsiktligt annan avgränsning',updatedAt:'now'};
  expect(evaluateReconciliations(d,[rule],[saved])[0].status).toBe('accepted');
  d.observations[3].value=25;expect(evaluateReconciliations(d,[rule],[saved])[0].status).toBe('difference');
 });
 it('reports missing instead of treating an empty section as zero',()=>{
  const d=fixture();d.observations=d.observations.filter(o=>o.kind==='detail');
  expect(evaluateReconciliations(d,[rule],[])[0]).toMatchObject({status:'missing'});
 });
 it('does not add a total column or unrelated year to either side',()=>{
  const d=fixture();d.observations.push({...d.observations[2],id:'F5',kind:'subtotal',value:100,source:{...d.observations[2].source,cell:'F5'}},{...d.observations[0],id:'D2028',period:{year:2028},value:400});
  expect(evaluateReconciliations(d,[rule],[])[0].status).toBe('match');
 });
});
