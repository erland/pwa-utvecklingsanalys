import {describe,expect,it} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import DepartmentDemandAnalysis from './DepartmentDemandAnalysis';
import {analyzeDepartmentDemand} from '../domain/departmentDemandAnalysis';
import type {DepartmentDemandObservation} from '../domain/semantic';

const observation=(id:string,planningType:'uo'|'project'|undefined,hours:number,year=2027):DepartmentDemandObservation=>({
 id,uoId:planningType==='project'?'project:Digitalisering':'uo:Förvaltning',
 ...(planningType?{planningType}:{}),departmentCodeRaw:'12',departmentCode:'12',departmentName:'- Resursavdelningen',
 metric:'business_hours',hours,year,anchoringStatus:'',comments:[],
 source:{datasetId:id,fileName:id+'.xlsx',sheet:'Timmar per avdelning',cell:'C17'}
});
const rows=[observation('uo-legacy',undefined,80),observation('project', 'project',20),observation('next-year','project',40,2028)];
describe('shared planning type between budget and department analysis',()=>{
 it('shows one common scope and no second independent selector in department analysis',()=>{
  for(const scope of ['uo','project','all'] as const){
   const html=renderToStaticMarkup(createElement(DepartmentDemandAnalysis,{records:rows,year:2027,metrics:['business_hours'],planningType:scope}));
   expect(html).toContain('Planering:');
   expect(html).not.toContain('Planeringstyp för avdelningar');
   expect(html).not.toContain('<select');
   expect(html).toContain(scope==='all'?'Alla – UO och projekt':scope==='uo'?'UO':'Projekt');
  }
 });
 it('honours UO including historical records without explicit type and respects year',()=>{
  const total=(planningType:'uo'|'project'|'all',year:number)=>analyzeDepartmentDemand(rows,{
   perspective:'department',metrics:['business_hours'],planningType,year
  }).total;
  expect(total('uo',2027)).toBe(80);
  expect(total('project',2027)).toBe(20);
  expect(total('all',2027)).toBe(100);
  expect(total('all',2028)).toBe(40);
  expect(total('uo',2028)).toBe(0);
 });
});
