import {describe,expect,it} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {emptyCanonical,type AnalysisRecord} from '../domain/canonical';
import type {GapState} from '../gaps/store';
import UoDetailBreakdown,{visibleUoDetailRows} from './UoDetailBreakdown';

const gaps:GapState={requirements:[],resolutions:[]};
const make=(id:string,part:string|undefined,value:number,year=2027):AnalysisRecord=>({
 id,year,value,metric:'it_hours',activity:'unknown',authority:'original',approval:'reported',
 granularity:'total',workPart:part? 'lo':'uo-overhead',
 scope:part?{axis:'work',uoId:'uo:Test',loId:'lo:Test:'+part}:{axis:'work',uoId:'uo:Test'},
 workloadId:'source|'+(part??'overhead')+'|'+year,
 source:{datasetId:'source',sheet:'Budget',cell:id}
});
const source=()=>{
 const a=make('D26','A',100);
 return {...emptyCanonical(),records:[
  a,make('D30','B',50),make('D35',undefined,20),
  {...a,id:'A-dev',value:0,activity:'development' as const,granularity:'activity-part' as const,
   authority:'derived' as const,approval:'approved' as const,source:undefined},
  {...a,id:'A-maint',value:100,activity:'maintenance' as const,granularity:'activity-part' as const,
   authority:'derived' as const,approval:'approved' as const,source:undefined},
  make('Q26','C',30,2028)
 ]};
};
describe('UO and LO activity coverage navigation',()=>{
 it('keeps all LO and overhead under activity filters and preserves a real zero',()=>{
  const data=source();
  const rows=visibleUoDetailRows(data,gaps,['it_hours'],2027,'uo:Test','development');
  expect(rows.map(r=>[r.key,r.value,r.unallocated])).toEqual([
   ['lo:Test:A',0,0],['lo:Test:B',null,50],['uo-overhead:uo:Test',null,20]
  ]);
  expect(visibleUoDetailRows(data,gaps,['it_hours'],2027,'uo:Test','maintenance')
   .map(r=>[r.key,r.value,r.unallocated])).toEqual([
    ['lo:Test:A',100,0],['lo:Test:B',null,50],['uo-overhead:uo:Test',null,20]
   ]);
 });
 it('keeps total hours separate and respects year and selected metric',()=>{
  const data=source();
  expect(visibleUoDetailRows(data,gaps,['it_hours'],2027,'uo:Test','all')
   .map(r=>r.value)).toEqual([100,50,20]);
  expect(visibleUoDetailRows(data,gaps,['it_hours'],2028,'uo:Test','development')
   .map(r=>[r.key,r.unallocated])).toEqual([['lo:Test:C',30]]);
  expect(visibleUoDetailRows(data,gaps,['business_hours'],2027,'uo:Test','development')).toEqual([]);
 });
 it('keeps missing LO navigable while explicitly labeling absent activity amounts',()=>{
  const html=renderToStaticMarkup(createElement(UoDetailBreakdown,{
   data:source(),state:gaps,metrics:['it_hours'],activity:'development',year:2027,
   selectedUoId:'uo:Test',onPartSelect:()=>{}
  }));
  expect(html).toContain('>B</button>');
  expect(html).toContain('UO Övergripande');
  expect(html).toContain('Ofördelat: 50 h');
  expect(html).toContain('Ej beräkningsbar');
  expect(html).toContain('0 h');
  expect(html).toContain('analysis-drilldown-label');
 });
});
