import {describe,it,expect} from 'vitest';
import {emptyCanonical,type AnalysisRecord} from './canonical';
import {prepareAnalysisDataset} from './preparedAnalysis';
import {saveManualUoSplit} from '../allocations/manualUoAllocation';
import type {GapState} from '../gaps/store';

const total=(lo:string,value:number):AnalysisRecord=>({
 id:lo,metric:'it_hours',year:2027,value,activity:'unknown',scope:{axis:'work',uoId:'uo:A',loId:'lo:A:'+lo},
 authority:'original',approval:'reported',workloadId:'work:'+lo,granularity:'total',workPart:'lo',
 source:{datasetId:'source',sheet:'Budget',cell:lo}
});
const base:GapState={requirements:[],resolutions:[]};
describe('manual UO allocation in analysis preparation',()=>{
 it('balances all LO while retaining source totals',()=>{
  const original={...emptyCanonical(),records:[total('A',40),total('B',60)]};
  const split=saveManualUoSplit(original,[],{uoId:'uo:A',year:2027,metric:'it_hours',developmentPercent:70});
  const prepared=prepareAnalysisDataset(original,{...base,manualUoSplits:split}).dataset;
  const derived=prepared.records.filter(r=>r.authority==='derived');
  expect(derived.filter(r=>r.activity==='development').reduce((n,r)=>n+r.value,0)).toBeCloseTo(70);
  expect(derived.filter(r=>r.activity==='maintenance').reduce((n,r)=>n+r.value,0)).toBeCloseTo(30);
  expect(prepared.records.filter(r=>r.authority==='original')).toEqual(original.records);
 });
 it('does not silently replace imported locked LO activity',()=>{
  const original={...emptyCanonical(),records:[total('A',40),total('B',60),
   ...(['development','maintenance'] as const).map((activity,i):AnalysisRecord=>({
    id:'lock:'+activity,metric:'it_hours',year:2027,value:i===0?30:10,activity,
    scope:{axis:'work',uoId:'uo:A',loId:'lo:A:A'},authority:'original',approval:'reported',
    granularity:'activity-part',workloadId:'work:A',source:{datasetId:'source',sheet:'LO',cell:activity}
   }))]};
  const split=saveManualUoSplit(original,[],{uoId:'uo:A',year:2027,metric:'it_hours',developmentPercent:70});
  const derived=prepareAnalysisDataset(original,{...base,manualUoSplits:split}).dataset.records.filter(r=>r.authority==='derived');
  expect(derived.every(r=>r.scope.axis==='work'&&r.scope.loId==='lo:A:B')).toBe(true);
  expect(derived.find(r=>r.activity==='development')?.value).toBeCloseTo(40);
 });
 it('ignores stale decisions after replacing source values',()=>{
  const original={...emptyCanonical(),records:[total('A',40)]};
  const split=saveManualUoSplit(original,[],{uoId:'uo:A',year:2027,metric:'it_hours',developmentPercent:50});
  const changed={...emptyCanonical(),records:[total('A',80)]};
  expect(prepareAnalysisDataset(changed,{...base,manualUoSplits:split}).dataset.records.filter(r=>r.authority==='derived')).toHaveLength(0);
 });
});
