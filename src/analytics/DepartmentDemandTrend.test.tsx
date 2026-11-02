import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {createElement} from 'react';
import DepartmentDemandTrend from './DepartmentDemandTrend';
import type {DepartmentDemandObservation} from '../domain/semantic';

const observation=(uoId:string,departmentCode:string,year:number,metric:'it_hours'|'business_hours',hours:number):DepartmentDemandObservation=>({
 id:[uoId,departmentCode,year,metric].join('-'),uoId,departmentCode,departmentCodeRaw:departmentCode,departmentName:departmentCode==='10'?'- Avdelning A':'Avdelning B',year,metric,hours,anchoringStatus:'',comments:[],
 source:{datasetId:uoId,fileName:'fixture.xlsx',sheet:'Timmar per avdelning',cell:'C6'}
});
const records=[
 observation('uo:A','10',2027,'it_hours',100),observation('uo:B','10',2027,'business_hours',40),
 observation('uo:A','10',2028,'it_hours',130),observation('uo:B','10',2028,'business_hours',50),
 observation('uo:A','20',2027,'it_hours',20),observation('uo:A','20',2028,'it_hours',25)
];
describe('DEV-231 department demand annual trend',()=>{
 it('shows year table following metric selection without mixing IT and business hours',()=>{
  const html=renderToStaticMarkup(createElement(DepartmentDemandTrend,{records,metrics:['it_hours']}));
  expect(html).toContain('Linjediagram för avdelningsbehov');
  expect(html).toContain('2027');expect(html).toContain('2028');
  expect(html).toContain('100 h');expect(html).toContain('130 h');
  expect(html).not.toContain('140 h');
 });
 it('uses requesting UOs when drilled into one department',()=>{
  const html=renderToStaticMarkup(createElement(DepartmentDemandTrend,{records,metrics:['it_hours','business_hours'],selectedDepartment:'10'}));
  expect(html).toContain('Utveckling av efterfrågan per UO');
  expect(html).toContain('UO');expect(html).toContain('150 h');
  expect(html).toContain('100 h');expect(html).toContain('40 h');
 });
 it('hides trend without two available years',()=>{
  const html=renderToStaticMarkup(createElement(DepartmentDemandTrend,{records:records.filter(r=>r.year===2027),metrics:['it_hours']}));
  expect(html).toBe('');
 });
});
