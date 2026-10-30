import {describe,it,expect} from 'vitest';
import {partKey,shiftBinaryUo,weightedSummary,putPartRules,type WeightedPart} from './weightedSync';
import type {OptionalAllocations} from './optionalModel';
const parts:WeightedPart[]=[
 {scope:{kind:'lo',uoId:'uo',loId:'a'},hours:500},
 {scope:{kind:'lo',uoId:'uo',loId:'b'},hours:300},
 {scope:{kind:'uo-overhead',uoId:'uo'},hours:200}
];
const initial=new Map(parts.map((p,i)=>[partKey(p.scope),{direct:[100,0,0][i],indirect:[0,100,100][i]}]));
describe('DEV-138 timviktad tvåvägssynkronisering',()=>{
 it('recalculates UO from LO with hours, not an arithmetic mean',()=>{
  expect(weightedSummary(parts,initial,['direct','indirect'])).toMatchObject({hours:1000,percentages:{direct:50,indirect:50},allocatedHours:{direct:500,indirect:500}});
 });
 it('moves proportionally to 100% and 0%, including overhead',()=>{
  for(const target of [100,0,65]){
   const shifted=shiftBinaryUo(parts,initial,'direct','indirect',target);
   const result=weightedSummary(parts,shifted,['direct','indirect']);
   expect(result.percentages.direct).toBeCloseTo(target,8);
   expect(result.allocatedHours.direct+result.allocatedHours.indirect).toBeCloseTo(1000,8);
  }
  const at65=shiftBinaryUo(parts,initial,'direct','indirect',65);
  expect(at65.get(partKey(parts[0].scope))?.direct).toBe(100);
  expect(at65.get(partKey(parts[1].scope))?.direct).toBe(30);
 });
 it('editing one LO keeps the other parts intact and recomputes the total',()=>{
  const updated=new Map(initial);
  updated.set(partKey(parts[1].scope),{direct:40,indirect:60});
  expect(weightedSummary(parts,updated,['direct','indirect']).percentages.direct).toBe(62);
  expect(updated.get(partKey(parts[0].scope))?.direct).toBe(100);
 });
 it('rejects invalid targets and treats empty/zero-hour selections as zero',()=>{
  expect(()=>shiftBinaryUo(parts,initial,'direct','indirect',101)).toThrow('INVALID_TARGET');
  expect(weightedSummary([],initial,['direct']).percentages.direct).toBe(0);
  expect(weightedSummary([{...parts[0],hours:0}],initial,['direct']).percentages.direct).toBe(0);
 });
 it('persists all LO/overhead changes atomically as one configuration candidate',()=>{
  const config:OptionalAllocations={schemaVersion:2,dimensions:[],rules:[]};
  const result=putPartRules(config,'dimension',2027,parts,shiftBinaryUo(parts,initial,'direct','indirect',70));
  expect(result.rules).toHaveLength(3);
  expect(config.rules).toHaveLength(0);
  expect(result.rules.every(x=>x.year===2027)).toBe(true);
 });
});
