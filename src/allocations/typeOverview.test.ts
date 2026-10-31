import {describe,it,expect} from 'vitest';
import {allocationTypeOverview} from './typeOverview';
import type {OptionalAllocations} from './optionalModel';
import type {CanonicalDataset,AnalysisRecord} from '../domain/canonical';
import type {GapState} from '../gaps/store';
const gaps:GapState={requirements:[],resolutions:[]};
const record=(uoId:string,value:number):AnalysisRecord=>({id:uoId,metric:'it_hours',value,year:2027,activity:'unknown',scope:{axis:'work',uoId,loId:'lo:'+uoId},granularity:'total',workPart:'lo',authority:'original',approval:'reported',workloadId:uoId,source:{datasetId:'ds',sheet:'S',cell:uoId}});
const dataset:CanonicalDataset={schemaVersion:2,records:[record('uo:1',100),record('uo:2',300),record('uo:3',0)]};
const data:OptionalAllocations={schemaVersion:2,dimensions:[{id:'dim',name:'Effekt',categories:[{id:'a',name:'A'},{id:'b',name:'B'}],appliesTo:{metrics:['it_hours'],activities:'all'}}],rules:[{dimensionId:'dim',year:0,scope:{kind:'uo',uoId:'uo:1'},percentages:{a:80,b:20}},{dimensionId:'dim',year:0,scope:{kind:'uo',uoId:'uo:2'},percentages:{a:20,b:80}}]};
describe('DEV-159 fördelningstypernas översikt',()=>{
 it('beräknar viktade procent på timmar och ignorerar UO utan volym',()=>{
  const result=allocationTypeOverview(dataset,gaps,data,'dim',0,['uo:1','uo:2','uo:3']);
  expect(result).toMatchObject({total:400,allocated:400,applicable:2,missing:0});
  expect(result.percentages.a).toBeCloseTo(35);
  expect(result.percentages.b).toBeCloseTo(65);
 });
 it('redovisar saknad fördelning separat från viktade andelar',()=>{
  const config={...data,rules:data.rules.slice(0,1)};
  const result=allocationTypeOverview(dataset,gaps,config,'dim',2027,['uo:1','uo:2','uo:3']);
  expect(result).toMatchObject({total:400,allocated:100,missing:1,applicable:2,unallocated:300});
  expect(result.percentages.a).toBeCloseTo(80);
 });
});
