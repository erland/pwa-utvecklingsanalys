import {describe,it,expect} from 'vitest';
import {compareTrend} from './canonicalComparison';
import {canonicalTrend,type TrendPoint} from './canonicalTrend';
import {emptyCanonical,type AnalysisRecord} from '../domain/canonical';
import type {GapState} from '../gaps/store';
const point=(year:number,value:number,metric:'it_hours'|'business_hours'='it_hours',unknownCount=0):TrendPoint=>({year,value,metric,unit:'h',unknownCount,staleApprovals:0});
describe('canonical year comparison',()=>{
 it('computes actual difference and relative change within a metric',()=>{
  expect(compareTrend([point(2027,700),point(2028,500)])).toMatchObject([{fromYear:2027,toYear:2028,difference:-200,percent:-200/700*100}]);
 });
 it('does not make up missing years or conflate separate measures',()=>{
  expect(compareTrend([point(2027,700),point(2029,500),point(2028,100,'business_hours')])).toEqual([]);
 });
 it('avoids division by zero and flags incomplete activity coverage',()=>{
  expect(compareTrend([point(2027,0),point(2028,120,'it_hours',1)])[0]).toMatchObject({difference:120,percent:null,incomplete:true});
 });
 it('uses the same UO or LO selection for all consecutive years',()=>{
  const record=(uoId:string,loId:string,year:number,value:number):AnalysisRecord=>({id:uoId+loId+year,metric:'it_hours',value,year,activity:'unknown',scope:{axis:'work',uoId,loId},authority:'original',approval:'reported',granularity:'total',workloadId:'ds|'+uoId+'|'+loId+'|'+year,source:{datasetId:'ds',sheet:'Budget',cell:'D1'}});
  const data={...emptyCanonical(),records:[record('uo:A','lo:A:1',2027,100),record('uo:A','lo:A:1',2028,120),record('uo:A','lo:A:2',2027,20),record('uo:A','lo:A:2',2028,40),record('uo:B','lo:B:1',2027,1000),record('uo:B','lo:B:1',2028,2000)],preparedAnalysis:{staleApprovals:0,excludedMatrix:0}};
  const state:GapState={requirements:[],resolutions:[]};
  const base={axis:'work' as const,metrics:['it_hours' as const],activity:'all' as const,uoIds:['uo:A']};
  expect(compareTrend(canonicalTrend(data,state,{...base,organizationLevel:'uo'})).map(x=>x.difference)).toEqual([40]);
  expect(compareTrend(canonicalTrend(data,state,{...base,detailUoId:'uo:A',detailPartId:'lo:A:1'})).map(x=>x.difference)).toEqual([20]);
  expect(compareTrend(canonicalTrend(data,state,{...base,detailUoId:'uo:A',detailPartId:'lo:A:2'})).map(x=>x.difference)).toEqual([20]);
  const missing={...data,records:data.records.filter(r=>!(r.scope.axis==='work'&&r.scope.loId==='lo:A:2'&&r.year===2028))};
  expect(compareTrend(canonicalTrend(missing,state,{...base,detailUoId:'uo:A',detailPartId:'lo:A:2'}))).toEqual([]);
 });
});
