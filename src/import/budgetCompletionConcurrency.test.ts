import {describe,expect,it} from 'vitest';
import {assertBudgetAllocationSnapshot} from './budgetCompletionConcurrency';
import type {GapState} from '../gaps/store';

const empty=():GapState=>({requirements:[],resolutions:[]});

describe('RR-03-02: budget completion stale editor detection',()=>{
 it('accepts a current snapshot, including unrelated GapState changes',()=>{
  const current=empty();
  expect(()=>assertBudgetAllocationSnapshot(current,{...current,requirements:[{
   id:'req',name:'Timmar',measureId:'it_hours',entityKind:'uo',years:[2027],activities:['development'],required:true
  }]})).not.toThrow();
  expect(()=>assertBudgetAllocationSnapshot(current,empty())).not.toThrow();
 });
 it('rejects an editor missing an already saved allocation rule',()=>{
  const latest={...empty(),activityAllocationRules:[{
   id:'rule',datasetId:'source',uoId:'uo:A',year:2027,metric:'it_hours' as const,reason:'Import'
  }]};
  expect(()=>assertBudgetAllocationSnapshot(empty(),latest)).toThrow('STALE_GAP_STATE');
 });
 it('rejects changed decisions without modifying either snapshot',()=>{
  const before=empty();
  const latest={...before,activityAllocationDecisions:[{
   ruleId:'rule',reason:'Import',approvedAt:'2026-11-04',overrides:[],sharedPercentages:false,fingerprint:'v1'
  }]};
  expect(()=>assertBudgetAllocationSnapshot(before,latest)).toThrow('STALE_GAP_STATE');
  expect(before.activityAllocationDecisions).toBeUndefined();
  expect(latest.activityAllocationDecisions).toHaveLength(1);
 });
});
