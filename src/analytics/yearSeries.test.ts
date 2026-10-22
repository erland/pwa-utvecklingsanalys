import {describe,it,expect} from 'vitest';
import {emptySemantic,type Observation} from '../domain/semantic';
import {analyzeYears} from './yearSeries';
describe('year series',()=>{
 it('deduplicates source cells and preserves UO filters, years and subtotal policy',()=>{
  const data=emptySemantic();data.entities=[{id:'u1',kind:'uo',name:'UO Ett',aliases:[]},{id:'u2',kind:'uo',name:'UO Två',aliases:[]}];
  const obs=(id:string,entityId:string,year:number,value:number,kind:Observation['kind']='detail'):Observation=>({id,entityId,measureId:'it_hours',value,kind,period:{year},scenario:'need',planningVersion:'v1',quality:'reported',source:{datasetId:'d',fileName:'f.xlsx',sheet:'S',cell:id}});
  data.observations=[obs('a','u1',2027,10),obs('b','u1',2028,20),obs('c','u2',2027,30),obs('sum','u1',2027,10,'subtotal'),obs('dup','u1',2027,10)];
  data.observations[4].source.cell='a';
  const result=analyzeYears(data,{measureId:'it_hours',groupBy:'uo'});
  expect(result.years).toEqual([2027,2028]);
  expect(result.totals).toEqual([40,20]);
  expect(result.rows.find(x=>x.key==='u2')?.values).toEqual([30,0]);
  expect(analyzeYears(data,{measureId:'it_hours',groupBy:'uo',uoIds:['u1']}).totals).toEqual([10,20]);
 });
 it('disallows non additive snapshot',()=>{
  const data=emptySemantic();data.observations=[];
  expect(()=>analyzeYears(data,{measureId:'fte',groupBy:'year'})).not.toThrow();
 });
});
