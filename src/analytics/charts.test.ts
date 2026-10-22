import {describe,expect,it} from 'vitest';
import {pieEligibility,pieSlices} from './charts';
import type {Result} from './query';
const sample=(values:number[]):Result=>({unit:'h',rows:values.map((value,i)=>({key:'k'+i,label:'Grupp '+i,value,count:1})),total:values.reduce((a,b)=>a+b,0),included:values.length,excluded:0});
describe('chart projection of analytical results',()=>{
 it('calculates percentages without recomputing or changing query totals',()=>{
  const result=sample([20,30,50]);const original=JSON.stringify(result);
  expect(pieEligibility(result)).toBeNull();
  expect(pieSlices(result).map(s=>s.percentage)).toEqual([20,30,50]);
  expect(pieSlices(result).at(-1)?.end).toBe(100);
  expect(JSON.stringify(result)).toBe(original);
 });
 it('rejects negatives and non-positive totals',()=>{
  expect(pieEligibility(sample([10,-3]))).toMatch(/negativa/);
  expect(pieSlices(sample([10,-3]))).toEqual([]);
  expect(pieEligibility(sample([0,0]))).toMatch(/positiv total/);
  expect(pieEligibility(sample([]))).toMatch(/Inga värden/);
 });
 it('does not mix or alter measurement units',()=>{
  const result={...sample([25,75]),unit:'SEK' as const};
  expect(pieSlices(result).map(s=>s.percentage)).toEqual([25,75]);
  expect(result.unit).toBe('SEK');
 });
});
