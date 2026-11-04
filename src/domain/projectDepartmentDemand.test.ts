import {describe,expect,it} from 'vitest';
import ExcelJS from 'exceljs';
import {projectBudget2027_30} from '../import/formats/projectBudget2027_30';
import {importProjectFacts,importBudgetFacts} from './importAdapter';
import {emptySemantic,validateSemantic,migrateSemantic} from './semantic';
import {analyzeDepartmentDemand} from './departmentDemandAnalysis';
import {departmentDemandDrilldown} from './departmentDemandDrilldown';
import {withoutSources} from '../import/sourceManagement';
import type {ImportResult} from '../import/uoBudget';

const budget=(uo:string):ImportResult=>({
 profile:'uo-budget-2027-v1',uo,issues:[],excludedSheets:[],
 facts:[{uo,area:'LO 1',measure:'business_hours',period:{year:2027},value:100,unit:'h',source:{sheet:'Budget',cell:'D26'}}],
 departmentDemand:[{uo,departmentCodeRaw:'721*',departmentCode:'721',departmentName:'- Kontrollavdelningen',
  year:2027,metric:'business_hours',hours:100,anchoringStatus:'',comments:[],
  source:{sheet:'Timmar per avdelning',cell:'C17'}}]
});
async function project(){
 const book=new ExcelJS.Workbook(),budget=book.addWorksheet('UO Tot 2027-30');
 budget.getCell('B1').value='Projekt: Gemensam digitalisering';
 budget.getCell('D11').value=2027;budget.getCell('B25').value='Integrationer';
 budget.getCell('C26').value='V timmar (h)';budget.getCell('D26').value=40;
 const demand=book.addWorksheet('Timmar per avdelning');
 demand.getCell('C4').value=2027;demand.getCell('A17').value='721*';
 demand.getCell('B17').value='- Kontrollavdelningen';demand.getCell('C17').value=40;
 return projectBudget2027_30.parse(await book.xlsx.writeBuffer() as ArrayBuffer);
}
describe('project department demand',()=>{
 it('imports UO and project hours separately, but combines their department requirements',async()=>{
  const p=await project();
  expect(p.departmentDemand).toEqual([expect.objectContaining({departmentCode:'721',year:2027,hours:40,source:{sheet:'Timmar per avdelning',cell:'C17'}})]);
  const u=importBudgetFacts(emptySemantic(),budget('Kontroll'),'uo-source','uo.xlsx');
  const both=importProjectFacts(u,p,'project-source','project.xlsx');
  expect(validateSemantic(both)).toEqual([]);
  expect(migrateSemantic(both)).toBeDefined();
  expect(both.observations.filter(o=>o.source.datasetId==='project-source')).toHaveLength(p.facts.length);
  const rows=both.departmentDemand??[];
  expect(rows).toHaveLength(2);
  expect(rows.find(r=>r.source.datasetId==='project-source')).toMatchObject({uoId:'project:Gemensam%20digitalisering',planningType:'project',hours:40});
  const options={perspective:'department' as const,year:2027,metrics:['business_hours'] as const};
  expect(analyzeDepartmentDemand(rows,options).total).toBe(140);
  expect(analyzeDepartmentDemand(rows,{...options,planningType:'uo'}).total).toBe(100);
  expect(analyzeDepartmentDemand(rows,{...options,planningType:'project'}).total).toBe(40);
  const detail=departmentDemandDrilldown(rows,{perspective:'department',id:'721',year:2027,metrics:['business_hours']});
  expect(detail.map(row=>[row.id,row.label,row.total]).sort()).toEqual([
   ['project:Gemensam%20digitalisering','Gemensam digitalisering',40],['uo:Kontroll','Kontroll',100]
  ]);
  expect(departmentDemandDrilldown(rows,{perspective:'department',id:'721',planningType:'project',year:2027,metrics:['business_hours']}).map(r=>r.id))
   .toEqual(['project:Gemensam%20digitalisering']);
  const removed=withoutSources(both,['project-source']);
  expect(removed.departmentDemand?.map(d=>d.uoId)).toEqual(['uo:Kontroll']);
 });
 it('does not fabricate project department allocation when the sheet is missing',async()=>{
  const p=await project();delete p.departmentDemand;
  const data=importProjectFacts(emptySemantic(),p,'project-source','project.xlsx');
  expect(data.departmentDemand).toEqual([]);
 });
});
