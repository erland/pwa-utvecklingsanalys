import {describe,it,expect} from 'vitest';
import {emptyCanonical,type AnalysisRecord} from '../domain/canonical';
import {organizationScope,visiblePartRows} from './organizationContext';
import {analyzeCanonical} from './canonicalQuery';
import {canonicalGroupYears} from './canonicalGroupYears';
import type {GapState} from '../gaps/store';

const state:GapState={requirements:[],resolutions:[]};
const row=(uoId:string,loId:string|undefined,value:number,year:number,overhead=false,source='ds'):AnalysisRecord=>({
 id:[source,uoId,loId??'overhead',year].join('|'),metric:'it_hours',value,year,activity:'unknown',
 scope:{axis:'work',uoId,...(loId?{loId}:{})},
 workPart:overhead?'uo-overhead':'lo',granularity:'total',authority:'original',approval:'reported',
 workloadId:[source,uoId,loId??'overhead','it_hours',year].join('|'),
 source:{datasetId:source,sheet:'Budget',cell:uoId+year+(loId??'overhead')}
});
describe('DEV-109 organizational context',()=>{
 const data={...emptyCanonical(),records:[
  row('uo:A','lo:A:one',60,2027),row('uo:A','lo:A:two',30,2027),row('uo:A',undefined,10,2027,true),
  row('uo:B','lo:B:three',45,2027),row('uo:B',undefined,5,2027,true),
  row('uo:A','lo:A:one',70,2028),row('uo:A',undefined,15,2028,true),
  row('uo:B','lo:B:three',55,2028)
 ]};
 const base={axis:'work' as const,metrics:['it_hours' as const],activity:'all' as const,year:2027};
 it('shows only UO aggregated totals when comparing multiple UOs',()=>{
  const scope=organizationScope(data,{level:'all-uos'});
  const result=analyzeCanonical(data,state,{...base,uoIds:scope.uoIds});
  expect(result.rows.map(r=>r.key).sort()).toEqual(['uo:A','uo:B']);
  expect(result.total).toBe(150);
 });
 it('shows only chosen UO LOs plus correctly labeled overhead, with matching total',()=>{
  const scope=organizationScope(data,{level:'uo',uoId:'uo:A'});
  const result=analyzeCanonical(data,state,{...base,uoIds:scope.uoIds,detailUoId:scope.detailUoId});
  expect(result.rows.map(r=>r.label).sort()).toEqual(['one','two','UO Övergripande']);
  expect(result.total).toBe(100);
  const years=canonicalGroupYears(data,state,{...base,year:undefined,detailUoId:scope.detailUoId});
  expect(years.rows.some(r=>r.label==='three')).toBe(false);
 });
 it('filters a selected part without showing parts from other UOs',()=>{
  const selection={level:'part' as const,uoId:'uo:A',partId:'uo-overhead:uo:A'};
  const scope=organizationScope(data,selection);
  const rows=analyzeCanonical(data,state,{...base,detailUoId:scope.detailUoId}).rows;
  expect(visiblePartRows(rows,selection).map(r=>r.label)).toEqual(['UO Övergripande']);
 });
 it('uses selected group membership to restrict UO identities',()=>{
  const model={id:'model',name:'groups',groups:[{id:'first',name:'First',uoIds:['uo:A']}]};
  expect(organizationScope(data,{level:'group',groupId:'first'},model).uoIds).toEqual(['uo:A']);
  expect(organizationScope(data,{level:'group',groupId:'unassigned'},model).uoIds).toEqual(['uo:B']);
 });
});
