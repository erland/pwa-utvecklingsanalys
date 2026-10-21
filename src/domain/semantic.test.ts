import {describe,it,expect} from 'vitest';
import {emptySemantic,matchEntity,migrateSemantic,validateSemantic,type Entity} from './semantic';
import {importBudgetFacts} from './importAdapter';
import type {ImportResult} from '../import/uoBudget';
const entities:Entity[]=[{id:'uo:a',kind:'uo',name:'UO A',aliases:['Område Alfa']},{id:'uo:b',kind:'uo',name:'UO B',aliases:['Alfa']},{id:'uo:c',kind:'uo',name:'UO C',aliases:['Alfa']}];
describe('semantic catalog and identity',()=>{
 it('resolves exact and alias without guessing ambiguous names',()=>{
  expect(matchEntity(entities,'uo',' UO A ').status).toBe('exact');
  expect(matchEntity(entities,'uo','Område Alfa').candidates[0].id).toBe('uo:a');
  expect(matchEntity(entities,'uo','Alfa').status).toBe('ambiguous');
  expect(matchEntity(entities,'process','UO A').status).toBe('missing');
 });
 it('rejects broken references and malformed versions',()=>{
  const a=emptySemantic();a.relations.push({id:'r',type:'supports',fromId:'missing',toId:'missing2',validFrom:'2027-01-01'});
  expect(validateSemantic(a)).toContain('UNKNOWN_RELATION_ENDPOINT');
  expect(()=>migrateSemantic({...a,schemaVersion:2})).toThrow('Unsupported');
 });
});
const result:ImportResult={profile:'uo-budget-2027-v1',uo:'UO A',excludedSheets:[],issues:[],facts:[{uo:'UO A',area:'LO 1',measure:'it_hours',period:{year:2027,month:1},value:300,unit:'h',source:{sheet:'UO Tot 2027-30',cell:'D26'}}]};
describe('semantic import adapter',()=>{
 it('preserves source and does not duplicate a repeated dataset import',()=>{
  const a=importBudgetFacts(emptySemantic(),result,'ds1','test.xlsx');
  const b=importBudgetFacts(a,result,'ds1','test.xlsx');
  expect(b.entities).toHaveLength(2);
  expect(b.observations).toHaveLength(1);
  expect(b.observations[0].source).toEqual({datasetId:'ds1',fileName:'test.xlsx',sheet:'UO Tot 2027-30',cell:'D26'});
  expect(b.observations[0].kind).toBe('detail');
  expect(migrateSemantic(b).schemaVersion).toBe(1);
 });
 it('isolates different datasets and prevents ambiguous alias merging',()=>{
  const a=importBudgetFacts(emptySemantic(),result,'ds1','a.xlsx');
  expect(importBudgetFacts(a,result,'ds2','b.xlsx').observations).toHaveLength(2);
  const named={...a,entities:[...a.entities,{id:'uo:external',kind:'uo' as const,name:'Other',aliases:['UO X']}]};
  expect(()=>importBudgetFacts(named,{...result,uo:'UO X'},'ds2','b.xlsx')).toThrow('Confirm UO alias');
 });
 it('rejects blocking import errors',()=>expect(()=>importBudgetFacts(emptySemantic(),{...result,issues:[{code:'INVALID',severity:'error',message:'bad'}]},'ds1','a.xlsx')).toThrow());
});
