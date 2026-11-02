import {describe,it,expect} from 'vitest';
import {emptySemantic,type Observation,type DepartmentDemandObservation} from './semantic';
import {reconcileDepartmentDemand} from './departmentReconciliation';

const source={datasetId:'source-a',fileName:'budget.xlsx',sheet:'Timmar per avdelning',cell:'C6'};
const demand=(metric:'it_hours'|'business_hours',year:number,hours:number,cell:string):DepartmentDemandObservation=>({
 id:'d-'+cell,uoId:'uo:UO%20A',departmentCodeRaw:'10',departmentCode:'10',departmentName:'Avdelning A',year,metric,hours,anchoringStatus:'',comments:[],source:{...source,cell}
});
const budget=(metric:'it_hours'|'business_hours',value:number,year:number,month?:number,entityId='lo:UO%20A:LO%201'):Observation=>({
 id:[metric,year,month,entityId].join('-'),entityId,measureId:metric,value,period:{year,...(month?{month}:{})},planningVersion:'2027',scenario:'need',source:{...source,sheet:'UO Tot 2027-30'},kind:'detail',quality:'reported'
});
describe('department reconciliation',()=>{
 it('compares by UO year and metric without mixing another UO or another source',()=>{
  const d=emptySemantic();
  d.entities=[{id:'uo:UO%20A',kind:'uo',name:'UO A',aliases:[]},{id:'lo:UO%20A:LO%201',kind:'lo',name:'LO 1',parentId:'uo:UO%20A',aliases:[]}];
  d.departmentDemand=[demand('it_hours',2027,45,'C6'),demand('it_hours',2027,15,'C7'),demand('business_hours',2027,10,'C8')];
  d.observations=[budget('it_hours',50,2027),budget('business_hours',10,2027)];
  const actual=reconcileDepartmentDemand(d);
  expect(actual.find(x=>x.metric==='it_hours')).toMatchObject({departmentHours:60,budgetHours:50,difference:10,status:'different'});
  expect(actual.find(x=>x.metric==='business_hours')).toMatchObject({difference:0,status:'matched'});
  expect(d.observations[0].value).toBe(50);
 });
 it('uses annual rather than monthly data for the same entity and reports missing budget',()=>{
  const d=emptySemantic();
  d.entities=[{id:'uo:UO%20A',kind:'uo',name:'UO A',aliases:[]},{id:'lo:UO%20A:LO%201',kind:'lo',name:'LO 1',parentId:'uo:UO%20A',aliases:[]}];
  d.departmentDemand=[demand('it_hours',2027,100,'C6'),demand('it_hours',2029,5,'E6')];
  d.observations=[budget('it_hours',100,2027),budget('it_hours',40,2027,1)];
  expect(reconcileDepartmentDemand(d).map(x=>[x.year,x.budgetHours,x.difference,x.status])).toEqual([[2027,100,0,'matched'],[2029,null,null,'no-budget']]);
 });
 it('handles older datasets without department demand',()=>expect(reconcileDepartmentDemand({...emptySemantic(),departmentDemand:undefined})).toEqual([]));
});
