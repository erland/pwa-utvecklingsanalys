import {describe,it,expect} from 'vitest';
import {emptySemantic,type Observation} from '../domain/semantic';
import {analyze,measureSelection} from './query';
import {analyzeYears} from './yearSeries';
const data=()=>{
 const d=emptySemantic();d.entities=[{id:'u1',kind:'uo',name:'Enhet A',aliases:[]}];
 const add=(id:string,measureId:string,value:number,year=2027,kind:Observation['kind']='detail'):Observation=>({id,entityId:'u1',measureId,value,kind,period:{year},planningVersion:'v',scenario:'need',quality:'reported',source:{datasetId:'d',fileName:'data.xlsx',sheet:'S',cell:id}});
 d.observations=[add('a','it_hours',40),add('b','business_hours',20),add('c','consultant_cost',100),add('d','other_cost',50),add('e','headcount',7),add('f','fte',3),add('g','it_hours',30,2028),add('subtotal','it_hours',60,2027,'subtotal'),add('duplicate','it_hours',40)];
 d.observations.at(-1)!.source.cell='a';
 return d;
};
describe('composite measure families',()=>{
 it('sums compatible hour measures and excludes counts, FTE, costs and source duplicates',()=>{
  const d=data(),original=JSON.stringify(d);
  const x=analyze(d,{measureId:'all_hours',year:2027,groupBy:'uo'});
  expect(x).toMatchObject({unit:'h',total:60,included:2,excluded:2});
  expect(measureSelection(d,'all_hours').members.map(m=>m.id)).toEqual(['it_hours','business_hours']);
  expect(JSON.stringify(d)).toBe(original);
 });
 it('combines only SEK cost measures',()=>{
  expect(analyze(data(),{measureId:'all_costs',year:2027,groupBy:'uo'})).toMatchObject({unit:'SEK',total:150,included:2});
 });
 it('reuses filters and per-year logic for composite results',()=>{
  const d=data();
  expect(analyzeYears(d,{measureId:'all_hours',groupBy:'uo'}).totals).toEqual([60,30]);
  expect(analyze(d,{measureId:'all_hours',groupBy:'uo',datasetIds:['missing']}).total).toBe(0);
 });
 it('excludes future snapshot and ratio measures despite matching unit',()=>{
  const d=data();d.measures.push({id:'hour_snapshot',label:'Ögonblickstimmar',unit:'h',aggregation:'snapshot',description:''});
  d.observations.push({...d.observations[0],id:'snap',measureId:'hour_snapshot',value:999,source:{...d.observations[0].source,cell:'Z9'}});
  expect(analyze(d,{measureId:'all_hours',groupBy:'uo'}).total).toBe(90);
  expect(()=>analyze(d,{measureId:'headcount',groupBy:'uo'})).toThrow('Non-additive');
 });
});
