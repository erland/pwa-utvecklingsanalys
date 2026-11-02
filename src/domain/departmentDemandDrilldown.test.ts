import {describe,it,expect} from 'vitest';
import {departmentDemandDrilldown} from './departmentDemandDrilldown';
import type {DepartmentDemandObservation} from './semantic';
const record=(uoId:string,departmentCode:string,year:number,metric:'it_hours'|'business_hours',hours:number):DepartmentDemandObservation=>({
 id:[uoId,departmentCode,year,metric].join('|'),uoId,departmentCode,departmentCodeRaw:departmentCode,departmentName:'Avdelning '+departmentCode,year,metric,hours,anchoringStatus:'',comments:[],source:{datasetId:uoId,fileName:'f.xlsx',sheet:'Timmar per avdelning',cell:'C6'}
});
const data=[record('uo:A','10',2027,'it_hours',100),record('uo:B','10',2027,'business_hours',30),record('uo:B','20',2027,'it_hours',50),record('uo:A','10',2028,'it_hours',60)];
describe('department/UO drilldown',()=>{
 it('lists UOs that requested hours from one department within year',()=>{
  const rows=departmentDemandDrilldown(data,{perspective:'department',id:'10',year:2027,metrics:['it_hours','business_hours']});
  expect(rows.map(r=>[r.id,r.total]).sort()).toEqual([['uo:A',100],['uo:B',30]]);
 });
 it('lists departments used by a UO and respects metric selection',()=>{
  const rows=departmentDemandDrilldown(data,{perspective:'uo',id:'uo:B',year:2027,metrics:['it_hours']});
  expect(rows.map(r=>[r.id,r.total])).toEqual([['20',50]]);
 });
 it('applies configured group filtering and first match without duplication',()=>{
  const groupModel={id:'m',name:'M',groups:[{id:'g1',name:'G1',uoIds:['uo:A']},{id:'g2',name:'G2',uoIds:['uo:A','uo:B']}]};
  expect(departmentDemandDrilldown(data,{perspective:'department',id:'10',year:2027,metrics:['it_hours','business_hours'],scope:{level:'group',id:'g2'},groupModel}).map(r=>r.id)).toEqual(['uo:B']);
 });
});