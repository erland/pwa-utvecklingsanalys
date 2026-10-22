import {describe,it,expect} from 'vitest';
import {emptyCanonical,validateCanonical,summarizeCanonical,type AnalysisRecord} from './canonical';
const original=(overrides:Partial<AnalysisRecord>={}):AnalysisRecord=>({id:'total',metric:'it_hours',value:1000,year:2027,activity:'unknown',scope:{axis:'work',uoId:'uo1',loId:'lo1'},authority:'original',approval:'reported',workloadId:'w1',granularity:'total',source:{datasetId:'ds',sheet:'S',cell:'D12'},...overrides});
describe('canonical v2 analysis semantics',()=>{
 it('preserves original total without counting two derived activity parts twice',()=>{
  const records=[original(),original({id:'dev',value:600,activity:'development',granularity:'activity-part',authority:'derived',approval:'approved',source:undefined}),original({id:'maintenance',value:400,activity:'maintenance',granularity:'activity-part',authority:'derived',approval:'approved',source:undefined})];
  const data={...emptyCanonical(),records};
  expect(validateCanonical(data)).toEqual([]);
  expect(summarizeCanonical(data,'work',['it_hours'],'all').value).toBe(1000);
  expect(summarizeCanonical(data,'work',['it_hours'],'development').value).toBe(600);
  expect(summarizeCanonical(data,'work',['it_hours'],'maintenance').value).toBe(400);
 });
 it('reports missing activity coverage rather than putting all unknown hours in development',()=>{
  const data={...emptyCanonical(),records:[original()]};
  expect(summarizeCanonical(data,'work',['it_hours'],'development')).toMatchObject({value:0,unknown:1});
  expect(summarizeCanonical(data,'work',['it_hours'],'unknown')).toMatchObject({value:1000,unknown:1});
 });
 it('keeps department and LO allocations as separate, non-additive axes',()=>{
  const data={...emptyCanonical(),records:[original(),original({id:'department',scope:{axis:'department',departmentId:'dept1'},source:{datasetId:'ds',sheet:'S',cell:'F17'}})]};
  expect(summarizeCanonical(data,'work',['it_hours'],'all').value).toBe(1000);
  expect(summarizeCanonical(data,'department',['it_hours'],'all').value).toBe(1000);
 });
 it('rejects old format, duplicate totals, fake original without source and invalid dimensions',()=>{
  const data={...emptyCanonical(),records:[original(),original({id:'copy'})]};
  expect(validateCanonical(data)).toContain('DUPLICATE_TOTAL');
  expect(validateCanonical({...data,records:[original({source:undefined})]})).toContain('SOURCE_REQUIRED');
  expect(validateCanonical({...data,records:[original({activity:'development'})]})).toContain('INVALID_GRANULARITY');
  expect(validateCanonical({...data,schemaVersion:1 as 2})).toContain('INVALID_CANONICAL_VERSION');
 });
 it('does not count pending manual values in approved breakdown',()=>{
  const data={...emptyCanonical(),records:[original(),original({id:'dev',value:700,authority:'manual',approval:'pending',granularity:'activity-part',activity:'development',source:undefined})]};
  expect(summarizeCanonical(data,'work',['it_hours'],'development')).toMatchObject({value:0,unknown:1});
 });
});
