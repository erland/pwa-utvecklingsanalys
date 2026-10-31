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
 it('labels additive UO overhead separately from the alternative activity matrix',()=>{
  const extended={...input,facts:[...input.facts,{...input.facts[0],area:'UO Övergripande',value:100,source:{sheet:'Budget',cell:'D20'}}]};
  const records=canonicalFromBudget(extended,'source1',true);
  expect(records.filter(r=>r.workPart==='uo-overhead')).toHaveLength(1);
  expect(records.filter(r=>r.workPart==='lo')).toHaveLength(2);
  expect(records.filter(r=>r.workPart==='uo-activity-matrix')).toHaveLength(2);
  expect(validateCanonical({...emptyCanonical(),records})).toEqual([]);
 });
 it('aggregates 2027 monthly values and uses 2028 annual data without mixed periods',()=>{
  const row=input.facts[0];
  const detail={...input,facts:[
   {...row,value:10,period:{year:2027,month:1},source:{sheet:'Budget',cell:'D26'}},
   {...row,value:20,period:{year:2027,month:2},source:{sheet:'Budget',cell:'E26'}},
   {...row,value:0,period:{year:2027},source:{sheet:'Budget',cell:'P26'}},
   {...row,value:40,period:{year:2028},source:{sheet:'Budget',cell:'Q26'}}
  ]};
  const records=canonicalFromBudget(detail,'ds');
  expect(records).toHaveLength(2);
  expect(records.map(r=>[r.year,r.value,r.month])).toEqual([[2027,30,undefined],[2028,40,undefined]]);
  expect(validateCanonical({...emptyCanonical(),records})).toEqual([]);
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
 it('imports a locked original LO pair without adding extra workload and invalidates it on reimport',()=>{
  const original={...input,loActivities:[{area:'LO A',year:2027,metric:'it_hours' as const,development:240,maintenance:360,
   source:{sheet:'LO Aktiviteter 2027-2030',developmentCell:'D2',maintenanceCell:'E2'}}]};
  const records=canonicalFromBudget(original,'source1',true);
  expect(validateCanonical({...emptyCanonical(),records})).toEqual([]);
  expect(records.filter(r=>r.scope.axis==='work'&&r.scope.loId==='lo:UO%20A:LO%20A')).toHaveLength(3);
  expect(records.filter(r=>r.authority==='original'&&r.granularity==='activity-part'&&r.scope.axis==='work'&&r.scope.loId)).toHaveLength(2);
  expect(summarizeCanonical({...emptyCanonical(),records},'work',['it_hours'],'all').value).toBe(1000);
  const changed={...input,loActivities:[{...original.loActivities[0],development:200,maintenance:400}]};
  const next=replaceCanonicalSource({...emptyCanonical(),records},canonicalFromBudget(changed,'source1',true),'source1');
  expect(next.records).toHaveLength(records.length);
  expect(next.records.filter(r=>r.activity==='development'&&r.scope.axis==='work'&&r.scope.loId).map(r=>r.value)).toEqual([200]);
 });
 it('rejects LO activity pairs without a matching imported total or with mismatched hours',()=>{
  const pair={area:'LO A',year:2027,metric:'it_hours' as const,development:240,maintenance:300,
   source:{sheet:'LO Aktiviteter 2027-2030',developmentCell:'D2',maintenanceCell:'E2'}};
  expect(()=>canonicalFromBudget({...input,loActivities:[pair]},'source1',true)).toThrow('LO_ACTIVITY_TOTAL_MISMATCH');
  expect(()=>canonicalFromBudget({...input,loActivities:[{...pair,area:'LO Z'}]},'source1',true)).toThrow('LO_ACTIVITY_TOTAL_MISSING');
 });

});
