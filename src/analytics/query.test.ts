import {describe,it,expect} from 'vitest';
import {emptySemantic,type Observation,type SemanticDataset} from '../domain/semantic';
import {analyze} from './query';
const data=():SemanticDataset=>{
 const d=emptySemantic();d.entities=[{id:'u1',kind:'uo',name:'UO A',aliases:[]},{id:'l1',kind:'lo',name:'LO 1',aliases:[],parentId:'u1'},{id:'u2',kind:'uo',name:'UO B',aliases:[]},{id:'l2',kind:'lo',name:'LO 2',aliases:[],parentId:'u2'}];
 const obs=(id:string,entityId:string,year:number,value:number,kind:Observation['kind']='detail',datasetId='ds1'):Observation=>({id,entityId,measureId:'it_hours',value,kind,period:{year},scenario:'need',planningVersion:'2027',quality:'reported',source:{datasetId,fileName:datasetId+'.xlsx',sheet:'Sheet',cell:id}});
 d.observations=[obs('A1','l1',2027,20),obs('A2','l1',2028,40),obs('B1','l2',2027,30),obs('C1','l1',2027,50,'subtotal'),obs('A1-copy','l1',2027,20)];
 d.observations[4].source.cell='A1';
 return d;
};
describe('analytics query',()=>{
 it('groups by UO and year without counting source duplicates and subtotals',()=>{
  const r=analyze(data(),{measureId:'it_hours',year:2027,groupBy:'uo'});
  expect(r.total).toBe(50);expect(r.rows.map(x=>[x.label,x.value])).toEqual([['UO B',30],['UO A',20]]);expect(r.excluded).toBe(2);
 });
 it('supports dataset and UO selection',()=>{
  const d=data();d.observations[2].source.datasetId='ds2';
  expect(analyze(d,{measureId:'it_hours',datasetIds:['ds1'],year:2027,groupBy:'year'}).total).toBe(20);
  expect(analyze(d,{measureId:'it_hours',uoIds:['u2'],year:2027,groupBy:'entity'}).total).toBe(30);
 });
 it('rejects snapshots instead of summing employee counts',()=>{
  expect(()=>analyze(data(),{measureId:'headcount',groupBy:'year'})).toThrow('Non-additive');
 });
 it('keeps hours and currency separate',()=>expect(analyze(data(),{measureId:'other_cost',groupBy:'uo'})).toMatchObject({total:0,unit:'SEK'}));
});
