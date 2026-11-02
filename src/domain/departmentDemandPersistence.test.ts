import {describe,it,expect} from 'vitest';
import {emptySemantic,validateSemantic,migrateSemantic} from './semantic';
import {importBudgetFacts} from './importAdapter';
import {withoutSources} from '../import/sourceManagement';
import type {ImportResult} from '../import/formats/uoBudget2027_30';

const budget=(hours:number):ImportResult=>({
 profile:'uo-budget-2027-v1',uo:'UO A',issues:[],excludedSheets:[],
 facts:[{uo:'UO A',area:'LO 1',measure:'it_hours',period:{year:2027},value:100,unit:'h',source:{sheet:'UO Tot 2027-30',cell:'D26'}}],
 departmentDemand:[{uo:'UO A',departmentCodeRaw:'123*',departmentCode:'123',departmentName:'Avd A',year:2027,metric:'it_hours',hours,anchoringStatus:'Nej',comments:['Kontrollera'],source:{sheet:'Timmar per avdelning',cell:'C6'}}]
});

describe('department demand persistence',()=>{
 it('retains independent UO/department/metric provenance without adding budget observations',()=>{
  const data=importBudgetFacts(emptySemantic(),budget(130),'source-a','a.xlsx');
  expect(data.observations).toHaveLength(1);
  expect(data.departmentDemand).toEqual([expect.objectContaining({uoId:'uo:UO%20A',departmentCode:'123',hours:130,year:2027,metric:'it_hours',source:{datasetId:'source-a',fileName:'a.xlsx',sheet:'Timmar per avdelning',cell:'C6'}})]);
  expect(validateSemantic(data)).toEqual([]);
 });
 it('replaces same source values, preserves other sources, and removes by source',()=>{
  const first=importBudgetFacts(emptySemantic(),budget(130),'source-a','a.xlsx');
  const other=importBudgetFacts(first,budget(80),'source-b','b.xlsx');
  const replaced=importBudgetFacts(other,budget(150),'source-a','a-new.xlsx');
  expect(replaced.departmentDemand?.map(d=>[d.source.datasetId,d.hours]).sort()).toEqual([['source-a',150],['source-b',80]]);
  const removed=withoutSources(replaced,['source-a']);
  expect(removed.departmentDemand?.map(d=>d.source.datasetId)).toEqual(['source-b']);
  expect(removed.observations.map(d=>d.source.datasetId)).toEqual(['source-b']);
 });
 it('can load older semantic snapshots without departmentDemand',()=>{
  const older=emptySemantic();delete older.departmentDemand;
  expect(migrateSemantic(older).departmentDemand).toBeUndefined();
 });
});