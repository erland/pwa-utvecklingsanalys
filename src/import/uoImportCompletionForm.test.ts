import {describe,expect,it} from 'vitest';
import {emptyCanonical,type AnalysisRecord} from '../domain/canonical';
import {completionCandidates,groupCompletionRows,importedCompletionParts,completionValues,
 validCompletionValues,buildUoCompletionState} from './uoImportCompletionForm';
import {completionKey} from './uoImportCompletions';
import {saveManualUoSplit} from '../allocations/manualUoAllocation';

const lo=(id:string,year:number,value:number):AnalysisRecord=>({
 id:id+'-'+year,metric:'it_hours',year,value,activity:'unknown',
 scope:{axis:'work',uoId:'uo:A',loId:'lo:'+id},authority:'original',
 approval:'reported',granularity:'total',workPart:'lo',workloadId:'w:'+id+'-'+year,
 source:{datasetId:'source',sheet:'Budget',cell:id}
});
const makeData=()=>({...emptyCanonical(),records:[lo('A',2027,40),lo('B',2027,60),lo('A',2028,50),lo('B',2028,50)]});
describe('KF-003 import completion form rules',()=>{
 it('keeps candidates grouped by UO, year and metric',()=>{
  const data=makeData(),rows=completionCandidates(data);
  expect(rows.map(row=>row.year)).toEqual([2027,2028]);
  const groups=groupCompletionRows(rows);
  expect([...groups.keys()]).toEqual(['uo:A']);
  expect(groups.get('uo:A')).toHaveLength(2);
 });

 it('preserves blank, zero and numeric validation contract',()=>{
  expect(validCompletionValues({development:'',maintenance:'10'})).toBe(false);
  expect(validCompletionValues({development:' ',maintenance:'10'})).toBe(false);
  expect(validCompletionValues({development:'0',maintenance:'0'})).toBe(false);
  expect(validCompletionValues({development:'0',maintenance:'100'})).toBe(true);
  expect(validCompletionValues({development:'70.5',maintenance:'29.5'})).toBe(true);
  expect(validCompletionValues({development:'-1',maintenance:'101'})).toBe(false);
  expect(validCompletionValues({development:'NaN',maintenance:'100'})).toBe(false);
 });

 it('uses current saved completion when no draft and prefers draft when present',()=>{
  const data=makeData(),row=completionCandidates(data)[0];
  const saved=[{uoId:row.uoId,year:row.year,metric:row.metric,development:70,maintenance:30,sourceFingerprint:'fixture'}];
  expect(completionValues(data,row,saved,{})).toEqual({development:'70',maintenance:'30'});
  expect(completionValues(data,row,saved,{[completionKey(row)]:{development:'65',maintenance:'35'}}))
   .toEqual({development:'65',maintenance:'35'});
 });
 it('keeps imported halves authoritative over saved values',()=>{
  const data=makeData(),row=completionCandidates(data)[0];
  data.records.push({...lo('matrix',2027,20),id:'uo-dev',activity:'development',granularity:'activity-part',workPart:'uo-activity-matrix',scope:{axis:'work',uoId:'uo:A'}});
  expect(importedCompletionParts(data,row)).toHaveLength(1);
  expect(completionValues(data,row,[{uoId:row.uoId,year:row.year,metric:row.metric,development:50,maintenance:50,sourceFingerprint:'fixture'}],{}))
   .toEqual({development:'20',maintenance:'50'});
 });
 it('builds all years without mutating inputs and clears only matching manual splits',()=>{
  const data=makeData(),rows=completionCandidates(data);
  const splits=rows.map(row=>saveManualUoSplit(data,[],{uoId:row.uoId,year:row.year,metric:row.metric,developmentPercent:50})[0]);
  const untouched={...splits[0],year:2030};
  const state={requirements:[],resolutions:[],manualUoSplits:[...splits,untouched]};
  const values={development:'70',maintenance:'30'};
  const next=buildUoCompletionState(data,state,rows,()=>values);
  expect(next.uoImportCompletions).toHaveLength(2);
  expect(next.uoImportCompletions?.map(c=>c.year)).toEqual([2027,2028]);
  expect(next.manualUoSplits).toEqual([untouched]);
  expect(state.manualUoSplits).toHaveLength(3);
  expect(data.records).toHaveLength(4);
 });
 it('rejects invalid batch input before creating any new state',()=>{
  const data=makeData(),rows=completionCandidates(data);
  const state={requirements:[],resolutions:[]};
  expect(()=>buildUoCompletionState(data,state,rows,row=>row.year===2027?
   {development:'60',maintenance:'40'}:{development:'',maintenance:'20'}))
   .toThrow('INVALID_UO_COMPLETION_VALUES');
  expect(state).toEqual({requirements:[],resolutions:[]});
 });
});
