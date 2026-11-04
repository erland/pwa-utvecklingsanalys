import {describe,it,expect} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {emptyCanonical,type AnalysisRecord} from '../domain/canonical';
import type {GapState} from '../gaps/store';
import {saveProjectActivitySplit} from './projectActivityAllocation';
import ProjectAllocationsPanel,{projectAllocationOverview,projectAllocationVisualSummary} from './ProjectAllocationsPanel';

const gaps:GapState={requirements:[],resolutions:[]};
const r=(id:string,projectId:string,year:number,metric:AnalysisRecord['metric'],value:number):AnalysisRecord=>({
 id,metric,year,value,activity:'unknown',authority:'original',approval:'reported',
 granularity:'total',workloadId:'source|'+id+'|'+year+'|'+metric,
 scope:{axis:'project',projectId,partId:'project-part:'+projectId.slice(8)+':Part'},
 source:{datasetId:'source',sheet:'Budget',cell:id}
});
const data=()=>({...emptyCanonical(),records:[
 r('D26','project:Alpha',2027,'it_hours',100),
 r('D27','project:Alpha',2027,'business_hours',40),
 r('Q26','project:Alpha',2028,'it_hours',50),
 r('D30','project:Beta',2027,'other_cost',200),
 r('D32','project:Beta',2027,'consultant_cost',300),
 {...r('D33','project:Alpha',2027,'it_hours',100),id:'uo-only',scope:{axis:'work' as const,uoId:'uo:A',loId:'lo:A:X'}}
]});
describe('project activity distributions in the main allocations tab',()=>{
 it('shows only independent project sources and separates hours from costs',()=>{
  expect(projectAllocationOverview(data(),gaps,'hours',0)).toEqual([{id:'project:Alpha',records:3,allocated:0,total:190}]);
  expect(projectAllocationOverview(data(),gaps,'costs',2027)).toEqual([{id:'project:Beta',records:2,allocated:0,total:500}]);
  expect(projectAllocationOverview(data(),gaps,'hours',2027)[0].records).toBe(2);
  expect(projectAllocationOverview(data(),gaps,'hours',2028)[0].total).toBe(50);
  expect(projectAllocationOverview(data(),gaps,'costs',2028)).toEqual([]);
 });
 it('counts only source-fingerprint valid decisions as allocated',()=>{
  const source=data();
  const decisions=saveProjectActivitySplit(source,[],{workloadId:source.records[0].workloadId,developmentPercent:70});
  expect(projectAllocationOverview(source,{...gaps,projectActivitySplits:decisions},'hours',2027)[0]).toMatchObject({records:2,allocated:1,total:140});
  const changed={...source,records:source.records.map((entry,i)=>i===0?{...entry,value:110}:entry)};
  expect(projectAllocationOverview(changed,{...gaps,projectActivitySplits:decisions},'hours',2027)[0]).toMatchObject({records:2,allocated:0,total:150});
 });
 it('keeps an accessible collapsible project section without replacing UO allocation cards',()=>{
  const html=renderToStaticMarkup(createElement(ProjectAllocationsPanel,{data:data(),gaps,onSaved:()=>{}}));
  expect(html).toContain('Projektfördelningar');
  expect(html).toContain('Utveckling / Förvaltning – projekt');
  expect(html).toContain('aria-expanded="false"');
 });
 it('shows explicit unallocated remainder rather than treating an absent decision as 0% development',()=>{
  const source=data();
  expect(projectAllocationVisualSummary(source,gaps,'hours',2027,'project:Alpha')).toEqual({
   development:0,maintenance:0,unallocated:140,total:140,complete:false
  });
  const decisions=saveProjectActivitySplit(source,[],{workloadId:source.records[0].workloadId,developmentPercent:60});
  expect(projectAllocationVisualSummary(source,{...gaps,projectActivitySplits:decisions},'hours',2027,'project:Alpha')).toEqual({
   development:60,maintenance:40,unallocated:40,total:140,complete:false
  });
  const withBoth=saveProjectActivitySplit(source,decisions,{workloadId:source.records[1].workloadId,developmentPercent:25});
  expect(projectAllocationVisualSummary(source,{...gaps,projectActivitySplits:withBoth},'hours',2027,'project:Alpha')).toEqual({
   development:70,maintenance:70,unallocated:0,total:140,complete:true
  });
  expect(projectAllocationVisualSummary(source,{...gaps,projectActivitySplits:withBoth},'costs',2027,'project:Beta').unallocated).toBe(500);
 });
 it('removes stale saved split volumes from visualized allocation and retains full unallocated source total',()=>{
  const source=data();
  const decisions=saveProjectActivitySplit(source,[],{workloadId:source.records[0].workloadId,developmentPercent:70});
  const changed={...source,records:source.records.map((r,i)=>i===0?{...r,value:120}:r)};
  expect(projectAllocationVisualSummary(changed,{...gaps,projectActivitySplits:decisions},'hours',2027,'project:Alpha')).toEqual({
   development:0,maintenance:0,unallocated:160,total:160,complete:false
  });
 });
 it('hides the section if no project is imported',()=>{
  const source={...emptyCanonical(),records:[data().records.at(-1)!]};
  expect(renderToStaticMarkup(createElement(ProjectAllocationsPanel,{data:source,gaps,onSaved:()=>{}}))).toBe('');
 });
});
