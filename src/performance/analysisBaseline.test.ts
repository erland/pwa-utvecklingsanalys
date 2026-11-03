import {describe,expect,it} from 'vitest';
import {performance} from 'node:perf_hooks';
import {prepareAnalysisDataset} from '../domain/preparedAnalysis';
import {analyzeCanonical} from '../analytics/canonicalQuery';
import {canonicalTrend} from '../analytics/canonicalTrend';
import {canonicalGroupYears} from '../analytics/canonicalGroupYears';
import {allocationTypeOverview} from '../allocations/typeOverview';
import type {AnalysisRecord,CanonicalDataset,Metric} from '../domain/canonical';
import type {GapState} from '../gaps/store';
import type {OptionalAllocations} from '../allocations/optionalModel';

/**
 * IP-007: reproducible, synthetic performance baseline.
 * Timings are observations, never CI acceptance thresholds.
 * Runs under the existing Vitest command so the GitHub Actions log captures
 * the same measurements for every PR and on main.
 */
const state:GapState={requirements:[],resolutions:[]};
const years=[2027,2028,2029,2030];
const metrics=['it_hours','business_hours'] as const;
const loPerUo=4;
const values:Record<(typeof metrics)[number],number>={it_hours:100,business_hours:60};
const categories=[{id:'direct',name:'Direct'},{id:'indirect',name:'Indirect'}];
function fixture(uoCount:number){
 const records:AnalysisRecord[]=[];
 const rules:OptionalAllocations['rules']=[];
 let cell=1;
 const make=(id:string,metric:Metric,value:number,year:number,uoId:string,loId?:string,activity:AnalysisRecord['activity']='unknown'):AnalysisRecord=>({
  id,metric,value,year,activity,
  scope:{axis:'work',uoId,...(loId?{loId}:{})},
  workPart:loId?'lo':'uo-activity-matrix',
  authority:'original',approval:'reported',granularity:loId?'total':'activity-part',
  workloadId:[uoId,loId??'matrix',metric,year].join('|'),
  source:{datasetId:'synthetic-budget',sheet:'Generated',cell:'C'+cell++}
 });
 for(let u=0;u<uoCount;u++){
  const uoId='uo:'+u;
  rules.push({dimensionId:'impact',year:0,scope:{kind:'uo',uoId},percentages:{direct:70,indirect:30}});
  for(const year of years)for(const metric of metrics){
   for(const [index,activity] of (['development','maintenance'] as const).entries()){
    const percentage=metric==='it_hours'?[60,40][index]:[25,75][index];
    records.push(make('matrix:'+u+':'+year+':'+metric+':'+activity,metric,percentage,year,uoId,undefined,activity));
   }
   for(let lo=0;lo<loPerUo;lo++){
    const loId=uoId+':lo:'+lo;
    records.push(make('total:'+u+':'+lo+':'+year+':'+metric,metric,values[metric],year,uoId,loId));
   }
  }
 }
 const canonical:CanonicalDataset={schemaVersion:2,records};
 const optional:OptionalAllocations={
  schemaVersion:2,
  dimensions:[{id:'impact',name:'Impact',categories,appliesTo:{metrics:['it_hours'],activities:'all'}}],
  rules
 };
 return {canonical,optional,uoIds:Array.from({length:uoCount},(_,i)=>'uo:'+i)};
}
function measure(label:string,operation:()=>unknown){
 // One cold invocation plus three warm samples, preserving the same prepared
 // immutable input and query for every sample.
 operation();
 const samples:number[]=[];
 for(let i=0;i<3;i++){
  const start=performance.now();
  operation();
  samples.push(performance.now()-start);
 }
 const sorted=samples.slice().sort((a,b)=>a-b);
 return {stage:label,medianMs:Number(sorted[1].toFixed(2)),minMs:Number(sorted[0].toFixed(2)),maxMs:Number(sorted[2].toFixed(2))};
}
describe('IP-007 synthetic analysis performance baseline',()=>{
 for(const uoCount of [4,12,24]){
  it('preserves calculations and records stage timings for '+uoCount+' UO',()=>{
   const {canonical,optional,uoIds}=fixture(uoCount);
   const original=JSON.stringify(canonical);
   const prep=prepareAnalysisDataset(canonical,state);
   expect(prep.diagnostics).toEqual([]);
   expect(prep.staleApprovals).toBe(0);
   expect(prep.dataset.records.filter(r=>r.authority==='original')).toHaveLength(canonical.records.length);
   const query={axis:'work' as const,metrics:['it_hours','business_hours'] as Metric[],activity:'all' as const,organizationLevel:'uo' as const};
   const expected=uoCount*loPerUo*years.length*(values.it_hours+values.business_hours);
   expect(analyzeCanonical(prep.dataset,state,query).total).toBe(expected);
   expect(canonicalTrend(prep.dataset,state,query).reduce((n,r)=>n+r.value,0)).toBe(expected);
   expect(canonicalGroupYears(prep.dataset,state,query).total).toBe(expected);
   const overview=allocationTypeOverview(prep.dataset,state,optional,'impact',2027,uoIds);
   expect(overview.total).toBe(uoCount*loPerUo*values.it_hours);
   expect(overview.allocated).toBeCloseTo(overview.total);
   expect(JSON.stringify(canonical)).toBe(original);
   const metricsTaken=[
    measure('prepareAnalysisDataset',()=>prepareAnalysisDataset(canonical,state)),
    measure('analyzeCanonical',()=>analyzeCanonical(prep.dataset,state,query)),
    measure('canonicalTrend',()=>canonicalTrend(prep.dataset,state,query)),
    measure('canonicalGroupYears',()=>canonicalGroupYears(prep.dataset,state,query)),
    measure('allocationTypeOverview',()=>allocationTypeOverview(prep.dataset,state,optional,'impact',2027,uoIds))
   ];
   // JSON lines can be extracted from CI logs and compared across commits.
   for(const timing of metricsTaken)console.info('IP007_BASELINE '+JSON.stringify({
    fixture:'synthetic-annual-v1',uoCount,years:years.length,loPerUo,sourceRecords:canonical.records.length,
    preparedRecords:prep.dataset.records.length,...timing
   }));
  });
 }
});
