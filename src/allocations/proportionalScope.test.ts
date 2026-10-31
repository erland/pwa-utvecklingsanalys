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
 it('materializes weighted UO changes for all years without flattening LO differences',()=>{
  const record=(id:string,year:number,loId:string,value:number)=>({id,metric:'it_hours' as const,value,year,activity:'unknown' as const,scope:{axis:'work' as const,uoId:'u',loId},granularity:'total' as const,workPart:'lo' as const,authority:'original' as const,approval:'reported' as const,workloadId:id,source:{datasetId:'ds',sheet:'S',cell:id}});
  const data:CanonicalDataset={schemaVersion:2,records:[record('a27',2027,'a',100),record('b27',2027,'b',100),record('a28',2028,'a',100)]};
  const before:OptionalAllocations={...config,rules:[
   {dimensionId:'d',year:2027,scope:{kind:'lo',uoId:'u',loId:'a'},percentages:{a:70,b:30}},
   {dimensionId:'d',year:2027,scope:{kind:'lo',uoId:'u',loId:'b'},percentages:{a:100,b:0}},
   {dimensionId:'d',year:2028,scope:{kind:'lo',uoId:'u',loId:'a'},percentages:{a:40,b:60}}
  ]};
  const changed=applyProportionalScope(data,gaps,before,dimension,{uoId:'u',year:0},60);
  const value=(y:number,id:string)=>changed.rules.find(r=>r.year===y&&r.scope.kind==='lo'&&r.scope.loId===id)!.percentages.a;
  expect(value(2027,'b')).toBeGreaterThan(value(2027,'a'));
  expect(value(2027,'a')).toBeGreaterThan(value(2028,'a'));
  expect((value(2027,'a')+value(2027,'b')+value(2028,'a'))/3).toBeCloseTo(60,8);
  const annual=applyProportionalScope(data,gaps,changed,dimension,{uoId:'u',year:2028},80);
  expect(annual.rules.find(r=>r.year===2027&&r.scope.kind==='lo'&&r.scope.loId==='b')!.percentages.a).toBe(value(2027,'b'));
  expect(annual.rules.find(r=>r.year===2028&&r.scope.kind==='lo'&&r.scope.loId==='a')!.percentages.a).toBeCloseTo(80,8);
  const lo=applyProportionalScope(data,gaps,before,dimension,{uoId:'u',loId:'a',year:0},50);
  expect(lo.rules.find(r=>r.year===2027&&r.scope.kind==='lo'&&r.scope.loId==='b')!.percentages.a).toBe(100);
  expect((lo.rules.find(r=>r.year===2027&&r.scope.kind==='lo'&&r.scope.loId==='a')!.percentages.a+lo.rules.find(r=>r.year===2028&&r.scope.kind==='lo'&&r.scope.loId==='a')!.percentages.a)/2).toBeCloseTo(50,8);
 });
});
