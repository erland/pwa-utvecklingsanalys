import {describe,it,expect} from 'vitest';
import {emptyCanonical,type AnalysisRecord} from '../domain/canonical';
import {saveManualUoSplit} from '../allocations/manualUoAllocation';
import {analyzeCanonical} from './canonicalQuery';
import type {GapState} from '../gaps/store';

const row=(id:string,value:number,year=2027):AnalysisRecord=>({
 id,metric:'it_hours',year,value,activity:'unknown',
 scope:{axis:'work',uoId:'uo:A',loId:'lo:A:'+id},
 authority:'original',approval:'reported',workloadId:'work:'+id+':'+year,
 granularity:'total',workPart:'lo',source:{datasetId:'source',sheet:'Budget',cell:id}
});
const base:GapState={requirements:[],resolutions:[]};
const query={axis:'work' as const,metrics:['it_hours' as const],year:2027};
describe('manual UO decisions through canonical analysis',()=>{
 it('shows 70/30 split without double-counting original LO totals',()=>{
  const data={...emptyCanonical(),records:[row('A',40),row('B',60)]};
  const manualUoSplits=saveManualUoSplit(data,[],{uoId:'uo:A',year:2027,metric:'it_hours',developmentPercent:70});
  const gaps={...base,manualUoSplits};
  expect(analyzeCanonical(data,gaps,{...query,activity:'all'}).total).toBe(100);
  expect(analyzeCanonical(data,gaps,{...query,activity:'development'}).total).toBeCloseTo(70);
  expect(analyzeCanonical(data,gaps,{...query,activity:'maintenance'}).total).toBeCloseTo(30);
  expect(analyzeCanonical(data,gaps,{...query,activity:'allocated'}).total).toBe(100);
  expect(analyzeCanonical(data,gaps,{...query,activity:'development',detailUoId:'uo:A'}).rows.reduce((n,r)=>n+r.value,0)).toBeCloseTo(70);
 });
 it('preserves imported LO split and balances only remaining LO',()=>{
  const data={...emptyCanonical(),records:[row('A',40),row('B',60),
   ...(['development','maintenance'] as const).map((activity,i):AnalysisRecord=>({
    id:'locked:'+activity,metric:'it_hours',year:2027,value:i===0?30:10,activity,
    scope:{axis:'work',uoId:'uo:A',loId:'lo:A:A'},authority:'original',approval:'reported',
    workloadId:'work:A:2027',granularity:'activity-part',
    source:{datasetId:'source',sheet:'LO',cell:activity}
   }))
  ]};
  const manualUoSplits=saveManualUoSplit(data,[],{uoId:'uo:A',year:2027,metric:'it_hours',developmentPercent:70});
  const gaps={...base,manualUoSplits};
  const dev=analyzeCanonical(data,gaps,{...query,activity:'development',detailUoId:'uo:A'});
  expect(dev.rows.find(r=>r.key==='lo:A:A')?.value).toBe(30);
  expect(dev.rows.find(r=>r.key==='lo:A:B')?.value).toBeCloseTo(40);
  expect(dev.total).toBeCloseTo(70);
  expect(analyzeCanonical(data,gaps,{...query,activity:'all'}).total).toBe(100);
 });
 it('does not reuse stale manual decisions after source replacement',()=>{
  const original={...emptyCanonical(),records:[row('A',100)]};
  const manualUoSplits=saveManualUoSplit(original,[],{uoId:'uo:A',year:2027,metric:'it_hours',developmentPercent:75});
  const changed={...emptyCanonical(),records:[row('A',120)]};
  expect(analyzeCanonical(changed,{...base,manualUoSplits},{...query,activity:'development'}).total).toBe(0);
  expect(analyzeCanonical(changed,{...base,manualUoSplits},{...query,activity:'all'}).total).toBe(120);
 });
});
