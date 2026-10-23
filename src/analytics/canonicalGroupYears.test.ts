import {describe,it,expect} from 'vitest';
import {emptyCanonical,type AnalysisRecord} from '../domain/canonical';
import {canonicalGroupYears} from './canonicalGroupYears';
import type {GapState} from '../gaps/store';
const state:GapState={requirements:[],resolutions:[]};
const record=(id:string,year:number,value:number,uoId:string,loId:string):AnalysisRecord=>({
 id,metric:'it_hours',value,year,activity:'unknown',scope:{axis:'work',uoId,loId},
 authority:'original',approval:'reported',granularity:'total',workPart:'lo',
 workloadId:['ds',uoId,loId,'it_hours',year,'year'].join('|'),
 source:{datasetId:'ds',sheet:'S',cell:id}
});
describe('v2 group × year matrix',()=>{
 it('pivots selected canonical sources without double-counting and keeps missing years distinct from zero',()=>{
  const data=emptyCanonical();
  data.records=[record('D26',2027,42,'uo:a','lo:a:1'),record('E26',2028,18,'uo:a','lo:a:1'),record('D32',2027,8,'uo:b','lo:b:1')];
  const query={axis:'work' as const,metrics:['it_hours' as const],activity:'all' as const,groupModel:{id:'m',name:'Grupper',groups:[{id:'g1',name:'Operativt',uoIds:['uo:a']},{id:'g2',name:'Stöd',uoIds:['uo:b']}]},groupBy:'organization' as const};
  const result=canonicalGroupYears(data,state,query);
  expect(result.years).toEqual([2027,2028]);
  expect(result.yearTotals).toEqual([50,18]);
  expect(result.total).toBe(68);
  expect(result.rows).toEqual([
   {key:'g1',label:'Operativt',values:[42,18],total:60},
   {key:'g2',label:'Stöd',values:[8,null],total:8}
  ]);
  const filtered=canonicalGroupYears(data,state,{...query,year:2028,uoIds:['uo:a']});
  expect(filtered.years).toEqual([2028]);
  expect(filtered.rows).toEqual([{key:'g1',label:'Operativt',values:[18],total:18}]);
 });
});
