import {describe,it,expect} from 'vitest';
import {emptyCanonical,type AnalysisRecord} from './canonical';
import {importedLoActivityLocks} from './importedLoLocks';
const scope={datasetId:'ds',uoId:'uo',metric:'it_hours' as const,year:2027};
const row=(id:string,activity:AnalysisRecord['activity'],value:number,authority:AnalysisRecord['authority']='original',loId='lo1'):AnalysisRecord=>({
 id,metric:'it_hours',year:2027,value,activity,scope:{axis:'work',uoId:'uo',loId},
 authority,approval:'reported',granularity:'activity-part',workloadId:'w1',
 source:{datasetId:'ds',sheet:'Budget',cell:id}
});
describe('DEV-183 imported LO locks',()=>{
 it('detects complete annual original pairs and keeps zero values',()=>{
  const data={...emptyCanonical(),records:[row('a','development',0),row('b','maintenance',100)]};
  expect(importedLoActivityLocks(data,scope)).toEqual({locks:[{loId:'lo1',development:0,maintenance:100}],incompleteLoIds:[]});
 });
 it('marks incomplete and duplicate LO values rather than deriving missing quantities',()=>{
  const data={...emptyCanonical(),records:[row('a','development',60),row('b','development',40,'original','lo2'),row('c','maintenance',50,'original','lo2'),row('d','maintenance',50,'original','lo2')]};
  expect(importedLoActivityLocks(data,scope)).toEqual({locks:[],incompleteLoIds:['lo1','lo2']});
 });
 it('excludes decisions, other sources, months, metrics and UO matrices',()=>{
  const sourceRow=row('a','development',20);
  const data={...emptyCanonical(),records:[
   {...sourceRow,authority:'derived' as const,approval:'approved' as const},
   {...row('b','maintenance',80),source:{datasetId:'other',sheet:'X',cell:'b'}},
   {...row('c','development',20),month:1},
   {...row('d','maintenance',80),metric:'business_hours' as const},
   {...row('e','development',20),scope:{axis:'work' as const,uoId:'uo'}},
   {...row('f','maintenance',80),scope:{axis:'work' as const,uoId:'uo'}}
  ]};
  expect(importedLoActivityLocks(data,scope)).toEqual({locks:[],incompleteLoIds:[]});
 });
});
