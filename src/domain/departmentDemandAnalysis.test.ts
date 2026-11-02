import {describe,it,expect} from 'vitest';
import {analyzeDepartmentDemand} from './departmentDemandAnalysis';
import type {DepartmentDemandObservation} from './semantic';
const entry=(uoId:string,code:string,year:number,metric:'it_hours'|'business_hours',hours:number):DepartmentDemandObservation=>({
 id:[uoId,code,year,metric].join('-'),uoId,departmentCodeRaw:code,departmentCode:code,departmentName:'Avdelning '+code,year,metric,hours,anchoringStatus:'',comments:[],
 source:{datasetId:uoId,fileName:'test.xlsx',sheet:'Timmar per avdelning',cell:'C6'}
});
describe('UO-to-department demand analysis',()=>{
 const data=[entry('uo:A','10',2027,'it_hours',100),entry('uo:B','10',2027,'business_hours',40),entry('uo:B','20',2027,'it_hours',30),entry('uo:A','10',2028,'it_hours',50)];
 it('aggregates department demands from several UO without dropping UO identity',()=>{
  const result=analyzeDepartmentDemand(data,{perspective:'department',year:2027,metrics:['it_hours','business_hours']});
  expect(result).toMatchObject({total:170,itHours:130,businessHours:40});
  expect(result.rows.find(x=>x.id==='10')).toMatchObject({total:140,itHours:100,businessHours:40});
 });
 it('switches perspective while retaining year and metric selections',()=>{
  const result=analyzeDepartmentDemand(data,{perspective:'uo',year:2027,metrics:['it_hours']});
  expect(result.total).toBe(130);
  expect(result.rows.map(r=>[r.id,r.total]).sort()).toEqual([['uo:A',100],['uo:B',30]]);
 });
 it('uses first matching group and preserves independent UO selection',()=>{
  const model={id:'m',name:'Grupper',groups:[{id:'g1',name:'Grupp 1',uoIds:['uo:A','uo:B']},{id:'g2',name:'Grupp 2',uoIds:['uo:A']}]};
  const base={perspective:'department' as const,year:2027,metrics:['it_hours','business_hours'] as const,groupModel:model};
  expect(analyzeDepartmentDemand(data,{...base,scope:{level:'group',id:'g1'}}).total).toBe(170);
  expect(analyzeDepartmentDemand(data,{...base,scope:{level:'group',id:'g2'}}).total).toBe(0);
  expect(analyzeDepartmentDemand(data,{...base,scope:{level:'uo',id:'uo:B'}}).total).toBe(70);
  expect(analyzeDepartmentDemand(data,{...base,scope:{level:'all'}}).total).toBe(170);
 });
 it('does not invent absent years or values',()=>{
  expect(analyzeDepartmentDemand(data,{perspective:'department',year:2030,metrics:['it_hours']}).total).toBe(0);
  expect(analyzeDepartmentDemand(data,{perspective:'department',year:2027,metrics:[]}).rows).toEqual([]);
 });
});