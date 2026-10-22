import {describe,it,expect} from 'vitest';
import {emptySemantic,type Observation} from '../domain/semantic';
import {calculateDistribution,type DistributionRule} from './distribution';
import type {InformationRequirement} from './model';
const req:InformationRequirement={id:'r',name:'Aktivitetsuppdelning',measureId:'it_hours',entityKind:'lo',years:[2027],activities:['development'],required:true};
const rule:DistributionRule={id:'d',requirementId:'r',year:2027,activity:'development',weightMeasureId:'it_hours',reason:'LO:s detaljtimmar'};
function fixture(){
 const d=emptySemantic();
 d.entities.push({id:'uo',name:'UO',kind:'uo',aliases:[]},{id:'a',name:'LO AUL',kind:'lo',parentId:'uo',aliases:[]},{id:'b',name:'LO IA',kind:'lo',parentId:'uo',aliases:[]});
 const obs=(id:string,entityId:string,value:number,kind:Observation['kind'],activity?:string):Observation=>({id,entityId,measureId:'it_hours',value,period:{year:2027},planningVersion:'2027',scenario:'need',source:{datasetId:'src',fileName:'u.xlsx',sheet:'S',cell:id},kind,quality:'reported',activity});
 d.observations.push(obs('D5','uo',100,'subset','development'),obs('D26','a',20,'detail'),obs('D32','b',30,'detail'));
 return d;
}
describe('distribution rule proposals',()=>{
 it('preserves UO total and proportional 2:3 weights without source mutation',()=>{
  const data=fixture(),original=JSON.stringify(data);
  const result=calculateDistribution(data,req,rule,[]);
  expect(result.items.map(i=>i.value)).toEqual([40,60]);
  expect(result.sourceTotal).toBe(100);expect(result.allocatedTotal).toBe(100);
  expect(JSON.stringify(data)).toBe(original);
 });
 it('rejects existing source or manual completions rather than double counting',()=>{
  const data=fixture();
  expect(()=>calculateDistribution(data,req,rule,[{key:JSON.stringify(['r','a',2027,'development']),status:'manual',value:10,reason:'',updatedAt:'now'}])).toThrow('EXISTING_COMPLETION_OR_SOURCE');
  data.observations.push({...data.observations[1],id:'manual-lo-activity',activity:'development'});
  expect(()=>calculateDistribution(data,req,rule,[])).toThrow('EXISTING_COMPLETION_OR_SOURCE');
 });
 it('reports invalid weights and reacts to changed source values',()=>{
  const data=fixture(),first=calculateDistribution(data,req,rule,[]);
  data.observations[1].value=50;
  const next=calculateDistribution(data,req,rule,[]);
  expect(next.items[0].value).not.toBe(first.items[0].value);
  expect(next.fingerprint).not.toBe(first.fingerprint);
  data.observations[1].value=-5;expect(()=>calculateDistribution(data,req,rule,[])).toThrow('INVALID_WEIGHT');
 });
 it('requires nonzero weights and one unambiguous UO',()=>{
  const data=fixture();data.observations[1].value=0;data.observations[2].value=0;
  expect(()=>calculateDistribution(data,req,rule,[])).toThrow('ZERO_WEIGHT_TOTAL');
  data.entities.push({id:'uo2',name:'UO 2',kind:'uo',aliases:[]});
  expect(()=>calculateDistribution(data,req,rule,[])).toThrow('REQUIRES_SINGLE_UO');
 });
});
