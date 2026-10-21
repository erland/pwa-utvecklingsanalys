import {describe,it,expect} from 'vitest';
import {emptySemantic} from '../domain/semantic';
import {emptyAllocations,createDimension,setAllocation} from '../allocations/model';
import {qualityIssues,newScenario,adjustScenario,approveScenario,scenarioCompare} from './model';
const fixture=()=>{const data=emptySemantic();data.entities=[{id:'uo',kind:'uo',name:'UO A',aliases:[]},{id:'lo',kind:'lo',name:'LO A',aliases:[],parentId:'uo'}];const observation={id:'o1',entityId:'lo',measureId:'it_hours',value:100,period:{year:2027},planningVersion:'2027',scenario:'reported',source:{datasetId:'d',fileName:'test.xlsx',sheet:'Tabell',cell:'C2'},kind:'detail' as const,quality:'reported' as const};data.observations=[observation];return {data,observation}};
describe('DEV-009 data quality and scenarios',()=>{
 it('flags incomplete distributions without inventing missing values',()=>{
  const {data}=fixture();const a=createDimension(emptyAllocations(),'Arbetstyp',['A','B'],'manual');const partial=setAllocation(a,{dimensionId:a.dimensions[0].id,entityId:'uo',year:2027,origin:'uo-proposal',percentages:{[a.dimensions[0].categories[0].id]:60}});
  expect(qualityIssues(data,partial,2027).some(i=>i.code==='UNALLOCATED')).toBe(true);
 });
 it('preserves the baseline and only adjusts scenario copy',()=>{
  const {data,observation}=fixture();const initial=newScenario({schemaVersion:1,scenarios:[]},'Alternativ','2027');const id=initial.scenarios[0].id;
  const adjusted=adjustScenario(initial,id,observation,140,'Ny prognos');expect(scenarioCompare(data,'2027',adjusted.scenarios[0],'it_hours',2027)).toMatchObject({baseline:100,scenario:140,difference:40});
  expect(data.observations[0].value).toBe(100);
  const approved=approveScenario(adjusted,id,data,[]);expect(approved.scenarios[0].status).toBe('approved');
  expect(()=>adjustScenario(approved,id,observation,200,'Ändring')).toThrow('APPROVED_SCENARIO_IMMUTABLE');
 });
 it('blocks approval with invalid source and adjustments',()=>{
  const {data,observation}=fixture();const s=newScenario({schemaVersion:1,scenarios:[]},'A','2027');const id=s.scenarios[0].id;
  expect(()=>approveScenario(s,id,data,[{id:'x',code:'MISSING_SOURCE',severity:'error',description:'Saknas'}])).toThrow('BLOCKING_DATA_QUALITY');
  expect(()=>adjustScenario(s,id,observation,NaN,'reason')).toThrow('INVALID_ADJUSTMENT');
 });
});
