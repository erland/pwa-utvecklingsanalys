import {describe,it,expect} from 'vitest';
import {partKey,shiftBinaryUo,weightedSummary,type WeightedPart} from './weightedSync';
import {applyProportionalScope} from './proportionalScope';
import type {OptionalAllocations,OptionalAllocationDimension} from './optionalModel';
import type {CanonicalDataset} from '../domain/canonical';
import type {GapState} from '../gaps/store';

const dimension:OptionalAllocationDimension={id:'d',name:'Test',categories:[{id:'a',name:'A'},{id:'b',name:'B'}],appliesTo:{metrics:['it_hours'],activities:'all'}};
const config:OptionalAllocations={schemaVersion:2,dimensions:[dimension],rules:[]};
const gaps:GapState={requirements:[],resolutions:[]};
describe('DEV-169 proportionella år- och LO-gränser',()=>{
 it('preserves differences when moving UO weighted total down',()=>{
  const parts:WeightedPart[]=[{scope:{kind:'lo',uoId:'u',loId:'a'},hours:100},{scope:{kind:'lo',uoId:'u',loId:'b'},hours:100},{scope:{kind:'uo-overhead',uoId:'u'},hours:100}];
  const values=new Map(parts.map((p,i)=>[partKey(p.scope),{a:[100,70,40][i],b:[0,30,60][i]}]));
  const moved=shiftBinaryUo(parts,values,'a','b',60);
  expect(weightedSummary(parts,moved,['a','b']).percentages.a).toBeCloseTo(60);
  expect(moved.get(partKey(parts[0].scope))!.a).toBeGreaterThan(moved.get(partKey(parts[1].scope))!.a);
  expect(moved.get(partKey(parts[1].scope))!.a).toBeGreaterThan(moved.get(partKey(parts[2].scope))!.a);
  expect(100-moved.get(partKey(parts[0].scope))!.a).toBeCloseTo(14.285714,4);
 });
 it('rejects invalid target before accessing data',()=>{
  expect(()=>applyProportionalScope({records:[]} as unknown as CanonicalDataset,gaps,config,dimension,{uoId:'u',year:0},101)).toThrow('INVALID_TARGET');
 });
});
