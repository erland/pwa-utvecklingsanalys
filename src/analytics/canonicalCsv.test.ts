import {describe,it,expect} from 'vitest';
import {canonicalCsv} from './canonicalCsv';
import type {CanonicalAnalysisResult} from './canonicalQuery';
import type {TrendPoint} from './canonicalTrend';
const result:CanonicalAnalysisResult={total:1100,unit:'h',rows:[{key:'uo',label:'UO Övergripande',value:100},{key:'lo',label:'LO 1',value:1000}],rowCounts:{uo:1,lo:1},includedRecords:2,unknownCount:0,staleApprovals:0,excludedAlternatives:2,coverage:''};
const trend:TrendPoint[]=[{year:2027,metric:'it_hours',value:1100,unit:'h',unknownCount:0,staleApprovals:0},{year:2028,metric:'it_hours',value:900,unit:'h',unknownCount:1,staleApprovals:0}];
describe('canonical CSV export',()=>{
 it('exports BOM, source-safe rows, yearly observations and computed comparisons',()=>{
  const csv=canonicalCsv(result,trend);
  expect(csv.startsWith('\uFEFF')).toBe(true);
  expect(csv).toContain('"Organisationsdel";"";"";"UO Övergripande";"100";"h"');
  expect(csv).toContain('"Årsjämförelse";"2027";"2028";"it_hours";"900";"h";"-200"');
  expect(csv).toContain('Ofullständig täckning');
  expect(csv.split('\r\n').filter(Boolean)).toHaveLength(6);
 });
 it('escapes spreadsheet formulas in labels',()=>{
  const csv=canonicalCsv({...result,rows:[{key:'unsafe',label:'=HYPERLINK("x")',value:3}]},[]);
  expect(csv).toContain("'=HYPERLINK");
 });
});
