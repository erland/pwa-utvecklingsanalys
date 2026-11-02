import {describe,expect,it} from 'vitest';
import {emptyCanonical,type AnalysisRecord} from '../domain/canonical';
import {saveUoImportCompletion,activeUoImportCompletions,withCompletedUoMatrices} from './uoImportCompletions';
import {previewActivityAllocation} from '../domain/activityAllocation';
import {analyzeCanonical} from '../analytics/canonicalQuery';

const lo=(id:string,value:number):AnalysisRecord=>({id,metric:'it_hours',year:2027,value,activity:'unknown',scope:{axis:'work',uoId:'uo:A',loId:'lo:'+id},authority:'original',approval:'reported',granularity:'total',workPart:'lo',workloadId:'w:'+id,source:{datasetId:'source',sheet:'Budget',cell:id}});
describe('import completion of incomplete UO matrix',()=>{
 it('uses absolute UO values for analysis without changing source totals',()=>{
  const data={...emptyCanonical(),records:[lo('A',40),lo('B',60)]};
  const uoImportCompletions=saveUoImportCompletion(data,[],{uoId:'uo:A',year:2027,metric:'it_hours',development:70,maintenance:30});
  const state={requirements:[],resolutions:[],uoImportCompletions};
  expect(analyzeCanonical(data,state,{axis:'work',metrics:['it_hours'],activity:'development',year:2027}).total).toBeCloseTo(70);
  expect(analyzeCanonical(data,state,{axis:'work',metrics:['it_hours'],activity:'all',year:2027}).total).toBe(100);
  expect(data.records).toHaveLength(2);
  const complete=withCompletedUoMatrices(data,uoImportCompletions);
  expect(complete.records.filter(r=>r.workPart==='uo-activity-matrix')).toHaveLength(2);
  const preview=previewActivityAllocation(complete,{id:'ui',datasetId:'source',uoId:'uo:A',year:2027,metric:'it_hours',reason:'Kompletterat i Import'});
  expect(preview.uo.development).toBeCloseTo(70);
  expect(preview.items).toHaveLength(2);
 });
 it('preserves existing source half and invalidates stale completions',()=>{
  const matrix:AnalysisRecord={...lo('sourcehalf',20),id:'matrix-dev',activity:'development',granularity:'activity-part',workPart:'uo-activity-matrix',scope:{axis:'work',uoId:'uo:A'},workloadId:'matrix'};
  const data={...emptyCanonical(),records:[lo('A',100),matrix]};
  expect(()=>saveUoImportCompletion(data,[],{uoId:'uo:A',year:2027,metric:'it_hours',development:30,maintenance:70})).toThrow('IMPORTED_ACTIVITY_MUST_BE_PRESERVED');
  const saved=saveUoImportCompletion(data,[],{uoId:'uo:A',year:2027,metric:'it_hours',development:20,maintenance:80});
  expect(activeUoImportCompletions(data,saved)).toHaveLength(1);
  expect(activeUoImportCompletions({...data,records:[lo('A',110),matrix]},saved)).toHaveLength(0);
 });
});
