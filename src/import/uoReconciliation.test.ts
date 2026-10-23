import {describe,it,expect} from 'vitest';
import {reconcileUoImport} from './uoReconciliation';
import type {ImportResult} from './uoBudget';
const base:ImportResult={profile:'budget',uo:'UO A',excludedSheets:[],issues:[],facts:[
 {uo:'UO A',area:'UO Övergripande',measure:'it_hours',period:{year:2027},value:100,unit:'h',source:{sheet:'S',cell:'D20'}},
 {uo:'UO A',area:'LO A',measure:'it_hours',period:{year:2027},value:600,unit:'h',source:{sheet:'S',cell:'D26'}},
 {uo:'UO A',area:'LO B',measure:'it_hours',period:{year:2027},value:300,unit:'h',source:{sheet:'S',cell:'D32'}}
]};
const matrix=(development:number,maintenance:number)=>({mapping:{} as never,issues:[],excludedTotals:0,facts:[
 {sectionId:'development-management',measureId:'it_hours',activity:'development',year:2027,value:development,unit:'h' as const,source:{sheet:'S',cell:'D5'}},
 {sectionId:'development-management',measureId:'it_hours',activity:'maintenance',year:2027,value:maintenance,unit:'h' as const,source:{sheet:'S',cell:'E5'}}
]});
describe('UO import reconciliation',()=>{
 it('adds UO overhead and LO and recognizes matching alternative activity matrix',()=>{const result=reconcileUoImport({...base,matrix:matrix(600,400)});expect(result).toMatchObject([{detail:1000,overhead:100,lo:900,matrix:1000,difference:0,status:'matched'}])});
 it('reports difference without changing source values',()=>{const r=reconcileUoImport({...base,matrix:matrix(500,400)})[0];expect(r).toMatchObject({detail:1000,matrix:900,difference:-100,status:'different'});expect(base.facts[0].value).toBe(100)});
 it('checks declared UO totals against additive detail without changing them',()=>{
  const declaredTotals=[{measure:'it_hours' as const,period:{year:2027},value:1000,source:{sheet:'S',cell:'D13'},formula:false}];
  expect(reconcileUoImport({...base,declaredTotals})[0]).toMatchObject({declared:1000,declaredDifference:0,declaredStatus:'matched'});
  const different=reconcileUoImport({...base,declaredTotals:[{...declaredTotals[0],value:1100}]})[0];
  expect(different).toMatchObject({declared:1100,declaredDifference:100,declaredStatus:'different'});
  expect(base.facts[0].value).toBe(100);
 });
 it('does not guess when multiple total cells or incompatible periods exist',()=>{
  const t={measure:'it_hours' as const,period:{year:2027},value:1000,source:{sheet:'S',cell:'D13'},formula:false};
  expect(reconcileUoImport({...base,declaredTotals:[t,{...t,source:{sheet:'S',cell:'D14'}}]})[0].declaredStatus).toBe('ambiguous');
  expect(reconcileUoImport({...base,declaredTotals:[{...t,period:{year:2027,month:1}}]})[0].declaredStatus).toBe('period-mismatch');
 });
 it('distinguishes absent matrix from zero',()=>expect(reconcileUoImport(base)[0].status).toBe('missing-matrix'));
 it('refuses to reconcile monthly entries against annual matrix',()=>{const facts=base.facts.map(x=>({...x,period:{year:2027,month:1}}));expect(reconcileUoImport({...base,facts,matrix:matrix(600,400)})[0].status).toBe('mixed-period')});
});
