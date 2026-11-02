import {describe,it,expect} from 'vitest';
import {emptyCanonical,type AnalysisRecord} from '../domain/canonical';
import {saveManualUoSplit,activeManualUoSplits} from './manualUoAllocation';
const row=(activity:'unknown'|'development'|'maintenance',year=2027,value=100):AnalysisRecord=>({
 id:activity+year,metric:'it_hours',year,value,activity,scope:activity==='unknown'?{axis:'work',uoId:'uo:A',loId:'lo:A:L'}:{axis:'work',uoId:'uo:A'},
 authority:'original',approval:'reported',workloadId:'work',granularity:activity==='unknown'?'total':'activity-part',
 workPart:activity==='unknown'?'lo':'uo-activity-matrix',source:{datasetId:'one',sheet:'A',cell:activity}
});
describe('manual UO decisions',()=>{
 it('stores an eligible percentage without modifying imported data',()=>{
  const data={...emptyCanonical(),records:[row('unknown')]};const before=JSON.stringify(data);
  const saved=saveManualUoSplit(data,[],{uoId:'uo:A',year:2027,metric:'it_hours',developmentPercent:65});
  expect(activeManualUoSplits(data,saved)).toHaveLength(1);expect(JSON.stringify(data)).toBe(before);
 });
 it('rejects imported complete pairs even when one half is zero',()=>{
  const data={...emptyCanonical(),records:[row('unknown'),row('development',2027,100),row('maintenance',2027,0)]};
  expect(()=>saveManualUoSplit(data,[],{uoId:'uo:A',year:2027,metric:'it_hours',developmentPercent:50})).toThrow('IMPORTED_UO_SPLIT_LOCKED_OR_MISSING');
 });
 it('invalidates decisions after source replacement',()=>{
  const data={...emptyCanonical(),records:[row('unknown')]};
  const saved=saveManualUoSplit(data,[],{uoId:'uo:A',year:2027,metric:'it_hours',developmentPercent:50});
  expect(activeManualUoSplits({...data,records:[row('unknown',2027,200)]},saved)).toEqual([]);
 });
});
