import {describe,it,expect} from 'vitest';
import {canonicalFromBudget,replaceCanonicalSource} from './canonicalImport';
import {emptyCanonical,summarizeCanonical,validateCanonical} from './canonical';
import type {ImportResult} from '../import/uoBudget';
const input:ImportResult={profile:'uo-budget-2027-v1',uo:'UO A',issues:[],excludedSheets:[],facts:[
 {uo:'UO A',area:'LO A',measure:'it_hours',value:600,unit:'h',period:{year:2027},source:{sheet:'Budget',cell:'D26'}},
 {uo:'UO A',area:'LO B',measure:'it_hours',value:400,unit:'h',period:{year:2027},source:{sheet:'Budget',cell:'D32'}}
],matrix:{mapping:{} as never,issues:[],excludedTotals:0,facts:[
 {sectionId:'development-management',measureId:'it_hours',activity:'development',year:2027,value:650,unit:'h',source:{sheet:'Budget',cell:'D5'}},
 {sectionId:'development-management',measureId:'it_hours',activity:'maintenance',year:2027,value:350,unit:'h',source:{sheet:'Budget',cell:'E5'}}
]}};
describe('canonical approved import mapping',()=>{
 it('keeps LO source totals and UO activity matrix distinct, fully traceable',()=>{
  const dataset={...emptyCanonical(),records:canonicalFromBudget(input,'source1',true)};
  expect(validateCanonical(dataset)).toEqual([]);
  expect(dataset.records).toHaveLength(4);
  expect(summarizeCanonical(dataset,'work',['it_hours'],'all').value).toBe(1000);
  expect(dataset.records.filter(r=>r.scope.axis==='work'&&'loId'in r.scope&&r.scope.loId).map(r=>r.value)).toEqual([600,400]);
  expect(dataset.records.filter(r=>r.activity!=='unknown').map(r=>r.value)).toEqual([650,350]);
 });
 it('reimporting same source replaces instead of adding values',()=>{
  const previous=replaceCanonicalSource(emptyCanonical(),canonicalFromBudget(input,'source1'),'source1');
  const changed={...input,facts:[{...input.facts[0],value:500}]};
  const next=replaceCanonicalSource(previous,canonicalFromBudget(changed,'source1'),'source1');
  expect(next.records).toHaveLength(1);expect(next.records[0].value).toBe(500);
 });
 it('department data is an alternative accounting axis',()=>{
  const records=canonicalFromBudget(input,'source1',false,[{department:'Avdelning X',measure:'it_hours',value:1000,period:{year:2027},source:{sheet:'Budget',cell:'G17'}}]);
  expect(records[2].scope).toEqual({axis:'department',departmentId:'department:Avdelning%20X'});
  expect(summarizeCanonical({...emptyCanonical(),records},'department',['it_hours']).value).toBe(1000);
  expect(summarizeCanonical({...emptyCanonical(),records},'work',['it_hours']).value).toBe(1000);
 });
 it('rejects unresolved import and negative data before staging',()=>{
  expect(()=>canonicalFromBudget({...input,issues:[{code:'x',severity:'error',message:'bad'}]},'source1')).toThrow('IMPORT_NOT_APPROVED');
  expect(()=>canonicalFromBudget({...input,facts:[{...input.facts[0],value:-1}]},'source1')).toThrow('NEGATIVE_SOURCE_AMOUNT');
 });
});
