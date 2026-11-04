import {describe,expect,it} from 'vitest';
import {loAllocationStatus,loBulkImpact} from './allocationUxStatus';
import type {AllocationPreview,ActivityAllocationDecision} from '../domain/activityAllocation';

const item=(loId:string)=>({loId,total:50,development:25,maintenance:25,workloadId:loId});
const preview=(locked:string[]=[],ruleId='r1'):AllocationPreview=>({
 ruleId,fingerprint:'fingerprint-'+ruleId,
 uo:{development:50,maintenance:50},items:[item('LO 1'),item('LO 2')],
 lockedLo:locked.map(loId=>({loId,development:25,maintenance:25}))
});
const decision=(overrides:ActivityAllocationDecision['overrides']):ActivityAllocationDecision=>({
 ruleId:'r1',fingerprint:'fingerprint-r1',approvedAt:'2026-11-04',reason:'Test',overrides
});

describe('UX-005: LO status',()=>{
 it('explains imported locks and does not describe them as editable',()=>{
  expect(loAllocationStatus([{previews:[preview(['LO 1'])]}],'LO 1',[])).toEqual({
   label:'Importerad · låst',description:expect.stringContaining('kan inte ändras')
  });
 });
 it('distinguishes proposed, saved and edited individual LO shares',()=>{
  const groups=[{previews:[preview()]}];
  expect(loAllocationStatus(groups,'LO 1',[]).label).toBe('Automatiskt föreslagen');
  expect(loAllocationStatus(groups,'LO 1',[decision([])]).label).toBe('Sparad fördelning');
  expect(loAllocationStatus(groups,'LO 1',[decision([{loId:'LO 1',developmentPercent:60}])]).label).toBe('Manuellt justerad · sparad');
  expect(loAllocationStatus(groups,'LO 2',[decision([{loId:'LO 1',developmentPercent:60}])]).label).toBe('Sparad fördelning');
  expect(loAllocationStatus(groups,'LO 1',[{...decision([]),fingerprint:'stale'}]).label).toBe('Automatiskt föreslagen');
 });
});

describe('UX-005: mass change explanation',()=>{
 it('reports editable and locked LO and blocks mixed imported values',()=>{
  const impact=loBulkImpact([{previews:[preview(['LO 1'])]}]);
  expect(impact).toMatchObject({editableLo:1,lockedLo:1,groups:1,mixedLocks:true,canApply:false});
  expect(impact.explanation).toContain('kan inte genomföras');
 });
 it('allows fully editable previews and blocks all-locked previews',()=>{
  expect(loBulkImpact([{previews:[preview()]}])).toMatchObject({editableLo:2,lockedLo:0,canApply:true});
  expect(loBulkImpact([{previews:[preview(['LO 1','LO 2'])]}])).toMatchObject({editableLo:0,lockedLo:2,canApply:false});
  expect(loBulkImpact([]).canApply).toBe(false);
 });
});
