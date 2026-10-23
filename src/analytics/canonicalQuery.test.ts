import {describe,it,expect} from 'vitest';
import {emptyCanonical,type AnalysisRecord} from '../domain/canonical';
import {previewActivityAllocation,approveActivityAllocation} from '../domain/activityAllocation';
import {analyzeCanonical} from './canonicalQuery';
import type {GapState} from '../gaps/store';
const gaps:GapState={requirements:[],resolutions:[]};
const row=(id:string,value:number,activity:AnalysisRecord['activity'],loId?:string):AnalysisRecord=>({
 id,metric:'it_hours',value,year:2027,activity,scope:{axis:'work',uoId:'uo',...(loId?{loId}:{})},
 authority:'original',approval:'reported',workloadId:loId?'ds|uo|'+loId+'|it_hours|2027|year':'ds|uo|it_hours|2027',granularity:loId?'total':'activity-part',
 source:{datasetId:'ds',sheet:'S',cell:id}
});
const data=()=>({...emptyCanonical(),records:[row('D5',600,'development'),row('E5',400,'maintenance'),row('D26',700,'unknown','lo1'),row('D32',300,'unknown','lo2')]});
const q={axis:'work' as const,metrics:['it_hours' as const],activity:'all' as const,year:2027};
describe('canonical analytics with source-aware completions',()=>{
 it('does not add alternative UO activity matrix to LO totals',()=>{
  const out=analyzeCanonical(data(),gaps,q);
  expect(out.total).toBe(1000);expect(out.excludedAlternatives).toBe(2);
 });
 it('preserves additive UO overhead totals while excluding the alternative activity matrix',()=>{
  const d=data();
  d.records.push({...row('D20',100,'unknown'),granularity:'total',workPart:'uo-overhead',workloadId:'ds|uo|overhead|it_hours|2027|year'});
  const out=analyzeCanonical(d,gaps,q);
  expect(out.total).toBe(1100);
  expect(out.excludedAlternatives).toBe(2);
  expect(out.rows.find(r=>r.key==='uo')?.value).toBe(100);
  expect(analyzeCanonical(d,gaps,{...q,activity:'unknown'}).total).toBe(1100);
 });
 it('rejects inconsistent explicit UO work roles',()=>{
  const d=data();d.records[2].workPart='uo-overhead';
  expect(()=>analyzeCanonical(d,gaps,q)).toThrow('INVALID_WORK_PART');
 });
 it('reports incomplete activity coverage instead of zero for development',()=>{
  const out=analyzeCanonical(data(),gaps,{...q,activity:'development'});
  expect(out.total).toBe(0);expect(out.unknownCount).toBe(2);
 });
 it('uses approved derived LO activities but never increments overall total',()=>{
  const d=data(),rule={id:'r',datasetId:'ds',uoId:'uo',metric:'it_hours' as const,year:2027,reason:'Reviewed allocation'};
  const decision=approveActivityAllocation(previewActivityAllocation(d,rule),'Approved');
  const state={...gaps,activityAllocationRules:[rule],activityAllocationDecisions:[decision]};
  expect(analyzeCanonical(d,state,{...q,activity:'development'}).total).toBe(600);
  expect(analyzeCanonical(d,state,{...q,activity:'maintenance'}).total).toBe(400);
  expect(analyzeCanonical(d,state,q).total).toBe(1000);
  const changed=data();changed.records[2].value=680;changed.records[3].value=320;
  const stale=analyzeCanonical(changed,state,{...q,activity:'development'});
  expect(stale.total).toBe(0);expect(stale.staleApprovals).toBe(1);expect(stale.unknownCount).toBe(2);
 });
 it('keeps department axis separate from work totals',()=>{
  const d=data();
  d.records.push({...row('F2',1000,'unknown','lo1'),scope:{axis:'department',departmentId:'department:DX'},workloadId:'ds|department|DX|it_hours|2027|year'});
  expect(analyzeCanonical(d,gaps,{...q,axis:'department'}).total).toBe(1000);
  expect(analyzeCanonical(d,gaps,q).total).toBe(1000);
 });
 it('filters sources and selected LO without adding overhead or alternative UO matrix',()=>{
  const d=data();d.records.push({...row('D20',100,'unknown'),granularity:'total',workPart:'uo-overhead',workloadId:'ds|uo|overhead|it_hours|2027|year'});
  d.records.push({...row('D40',50,'unknown','lo1'),id:'other-D40',workloadId:'other|uo|lo1|it_hours|2027|year',source:{datasetId:'other',sheet:'S',cell:'D40'}});
  expect(analyzeCanonical(d,gaps,{...q,datasetIds:['ds']}).total).toBe(1100);
  expect(analyzeCanonical(d,gaps,{...q,datasetIds:['ds'],loIds:['lo1']}).total).toBe(700);
  expect(analyzeCanonical(d,gaps,{...q,uoIds:['other']}).total).toBe(0);
  expect(analyzeCanonical(d,gaps,{...q,datasetIds:['other']}).total).toBe(50);
 });
 it('groups whole UO including overhead and LO, with first membership winning',()=>{
  const d=data();
  d.records.push({...row('D20',100,'unknown'),granularity:'total',workPart:'uo-overhead',workloadId:'ds|uo|overhead|it_hours|2027|year'});
  const groupModel={id:'m',name:'Modell',groups:[{id:'g1',name:'Operativt',uoIds:['uo']},{id:'g2',name:'Dubbel medlem',uoIds:['uo']}]};
  const out=analyzeCanonical(d,gaps,{...q,groupModel});
  expect(out.total).toBe(1100);
  expect(out.rows).toEqual([{key:'g1',label:'Operativt',value:1100}]);
  expect(analyzeCanonical(d,gaps,{...q,groupModel,loIds:['lo1']}).rows).toEqual([{key:'g1',label:'Operativt',value:700}]);
 });
 it('places unmatched UO in one unassigned group',()=>{
  const out=analyzeCanonical(data(),gaps,{...q,groupModel:{id:'m',name:'M',groups:[]}});
  expect(out.rows).toEqual([{key:'unassigned',label:'Ej grupperad',value:1000}]);
 });
 it('rejects mixing hours and costs',()=>{
  expect(()=>analyzeCanonical(data(),gaps,{...q,metrics:['it_hours','consultant_cost']})).toThrow('MIXED_UNITS');
 });
});
