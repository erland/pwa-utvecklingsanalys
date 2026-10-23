import {describe,it,expect} from 'vitest';
import {canonicalFromTable} from './canonicalTable';
import {emptyCanonical,summarizeCanonical} from './canonical';
import type {TableResult} from '../import/tabular';
const result:TableResult={profile:'generic',mapping:{sheet:'Avdelningar',headerRow:1,entityColumn:'A',yearColumn:'B',valueColumn:'C',entityKind:'department',measureId:'it_hours'},issues:[],sheets:['Avdelningar'],facts:[
 {entityKind:'department',entityName:'Avdelning X',measureId:'it_hours',year:2027,value:600,source:{sheet:'Avdelningar',cell:'C2'}},
 {entityKind:'department',entityName:'Avdelning Y',measureId:'it_hours',year:2027,value:400,source:{sheet:'Avdelningar',cell:'C3'}}
]};
describe('tabular department v2',()=>{
 it('preserves source identity and sums only the department axis',()=>{
  const records=canonicalFromTable(result,'ds');
  expect(records).toHaveLength(2);
  expect(records[0]).toMatchObject({source:{datasetId:'ds',sheet:'Avdelningar',cell:'C2'},activity:'unknown',scope:{axis:'department',departmentId:'department:Avdelning%20X'}});
  expect(summarizeCanonical({...emptyCanonical(),records},'department',['it_hours']).value).toBe(1000);
  expect(summarizeCanonical({...emptyCanonical(),records},'work',['it_hours']).value).toBe(0);
 });
 it('honors reviewed department identity resolutions',()=>{
  expect(canonicalFromTable(result,'ds',{'department:Avdelning X':'department:verified'})[0].scope).toEqual({axis:'department',departmentId:'department:verified'});
 });
 it('does not invent v2 dimensions for employee counts or process observations',()=>{
  expect(canonicalFromTable({...result,facts:[{...result.facts[0],measureId:'headcount'},{...result.facts[1],entityKind:'process'}]},'ds')).toEqual([]);
 });
 it('rejects negative hours and conflicting duplicate annual totals',()=>{
  expect(()=>canonicalFromTable({...result,facts:[{...result.facts[0],value:-1}]},'ds')).toThrow('NEGATIVE_DEPARTMENT_HOURS');
  expect(()=>canonicalFromTable({...result,facts:[result.facts[0],{...result.facts[0],source:{sheet:'Avdelningar',cell:'C4'}}]},'ds')).toThrow('DUPLICATE_TOTAL');
 });
});
