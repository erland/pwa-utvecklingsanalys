import {describe,it,expect} from 'vitest';
import type {AllocationPreview} from '../../domain/activityAllocation';
import {rebalanceUoBudgetAllocation as rebalance} from './uoBudgetCompletion';
import {uoBudget2027_30} from './uoBudget2027_30';

const preview=():AllocationPreview=>({
 ruleId:'rule-1',fingerprint:'source-v1',uo:{development:100,maintenance:100},
 items:[
  {loId:'LO1',total:100,development:50,maintenance:50,workloadId:'work1'},
  {loId:'LO2',total:100,development:50,maintenance:50,workloadId:'work2'}
 ]
});
describe('budget-format owned LO completion',()=>{
 it('registers the completion algorithm with the import format',()=>{
  if(uoBudget2027_30.kind!=='budget')throw new Error('NOT_BUDGET_FORMAT');
  expect(uoBudget2027_30.completion).toBe(rebalance);
 });
 it('balances an edited LO against another without altering UO or LO totals',()=>{
  const original=preview(),before=JSON.stringify(original);
  const actual=rebalance(original,[{loId:'LO1',developmentPercent:60}]);
  expect(actual.items.map(item=>[item.development,item.maintenance])).toEqual([[60,40],[40,60]]);
  expect(actual.items.reduce((n,item)=>n+item.development,0)).toBe(100);
  expect(actual.items.reduce((n,item)=>n+item.maintenance,0)).toBe(100);
  expect(actual.uo).toEqual(original.uo);
  expect(actual.fingerprint).toBe(original.fingerprint);
  expect(JSON.stringify(original)).toBe(before);
 });
 it('supports different LO sizes and preserves all remaining constraints',()=>{
  const original=preview();
  original.items[0]={...original.items[0],total:150,development:75,maintenance:75};
  original.items[1]={...original.items[1],total:50,development:25,maintenance:25};
  const actual=rebalance(original,[{loId:'LO1',developmentPercent:60}]);
  expect(actual.items.map(item=>[item.development,item.maintenance])).toEqual([[90,60],[10,40]]);
 });
 it('rejects infeasible allocations and invalid overrides instead of changing UO totals',()=>{
  expect(()=>rebalance(preview(),[{loId:'LO1',developmentPercent:100},{loId:'LO2',developmentPercent:100}])).toThrow('INFEASIBLE_LO_DISTRIBUTION');
  expect(()=>rebalance(preview(),[{loId:'LO3',developmentPercent:60}])).toThrow('UNKNOWN_LO');
  expect(()=>rebalance(preview(),[{loId:'LO1',developmentPercent:-1}])).toThrow('INVALID_DEVELOPMENT_PERCENT');
  expect(()=>rebalance(preview(),[{loId:'LO1',developmentPercent:50},{loId:'LO1',developmentPercent:60}])).toThrow('DUPLICATE_LO_OVERRIDE');
 });
 it('redistributes remaining hours across several LOs without overflow',()=>{
  const original=preview();
  original.items=[
   {loId:'LO1',total:100,development:50,maintenance:50,workloadId:'one'},
   {loId:'LO2',total:20,development:10,maintenance:10,workloadId:'two'},
   {loId:'LO3',total:80,development:40,maintenance:40,workloadId:'three'}
  ];
  const actual=rebalance(original,[{loId:'LO1',developmentPercent:80}]);
  expect(actual.items[0].development).toBe(80);
  expect(actual.items[1].development).toBe(4);
  expect(actual.items[2].development).toBe(16);
  expect(actual.items.reduce((n,item)=>n+item.development,0)).toBe(100);
 });
});
