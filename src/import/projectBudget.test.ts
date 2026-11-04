import {describe,it,expect} from 'vitest';
import ExcelJS from 'exceljs';
import {recognizeWorkbook} from './formats/registry';
import {canonicalFromProject,canonicalFromBudget,replaceCanonicalSource} from '../domain/canonicalImport';
import {importProjectFacts,importBudgetFacts} from '../domain/importAdapter';
import {emptyCanonical,summarizeCanonical,validateCanonical} from '../domain/canonical';
import {emptySemantic} from '../domain/semantic';

async function source(marker:string,area:string){
 const wb=new ExcelJS.Workbook(),sheet=wb.addWorksheet('UO Tot 2027-30');
 sheet.getCell('B1').value=marker;sheet.getCell('D11').value=2027;sheet.getCell('Q11').value='ÅRSBEHOV 2028';
 sheet.getCell('B25').value=area;
 sheet.getCell('C26').value='IT timmar (h)';sheet.getCell('D26').value=40;sheet.getCell('Q26').value=60;
 sheet.getCell('C27').value='V timmar (h)';sheet.getCell('D27').value=10;
 sheet.getCell('C28').value='OMK Övrigt (kr)';sheet.getCell('D28').value=300;
 sheet.getCell('B31').value=marker.startsWith('Projekt:')?'Integrationer':'LO B';
 sheet.getCell('C32').value='IT timmar (h)';sheet.getCell('D32').value=20;
 return await wb.xlsx.writeBuffer() as ArrayBuffer;
}
describe('independent project budget import',()=>{
 it('recognizes explicit project marker and arbitrary part names, while preserving UO format',async()=>{
  const project=await source('Projekt: Digitalisering','Gemensam informationshantering');
  const uo=await source('UO: Digitalisering','LO A');
  const pf=await recognizeWorkbook(project),uf=await recognizeWorkbook(uo);
  expect(pf?.kind).toBe('project');expect(uf?.kind).toBe('budget');
  if(pf?.kind!=='project'||uf?.kind!=='budget')throw Error('FORMAT_NOT_RECOGNIZED');
  const p=await pf.parse(project),u=await uf.parse(uo);
  expect(p.facts.some(x=>x.area==='Gemensam informationshantering')).toBe(true);
  expect(p.facts.some(x=>x.area==='Integrationer')).toBe(true);
  expect(p.facts.some(x=>x.source.cell==='D32')).toBe(true);
  expect(u.facts.some(x=>x.area==='LO A')).toBe(true);
  expect(p.facts.some(x=>x.area==='LO A')).toBe(false);
  const both=replaceCanonicalSource(replaceCanonicalSource(emptyCanonical(),canonicalFromBudget(u,'uo-source'),'uo-source'),canonicalFromProject(p,'project-source'),'project-source');
  expect(validateCanonical(both)).toEqual([]);
  const projectHours=summarizeCanonical(both,'project',['it_hours','business_hours'],'all').value;
  const uoHours=summarizeCanonical(both,'work',['it_hours','business_hours'],'all').value;
  expect(projectHours).toBe(130);expect(uoHours).toBe(130);
  expect(projectHours+uoHours).toBe(260);
  expect(summarizeCanonical(both,'project',['other_cost'],'all').value).toBe(300);
  expect(both.records.filter(r=>r.scope.axis==='project').every(r=>r.scope.axis==='project'&&r.scope.projectId==='project:Digitalisering'&&r.scope.partId.startsWith('project-part:'))).toBe(true);
  const semantic=importProjectFacts(importBudgetFacts(emptySemantic(),u,'uo-source','uo.xlsx'),p,'project-source','project.xlsx');
  expect(semantic.entities.find(e=>e.id==='project:Digitalisering')?.kind).toBe('project');
  expect(semantic.entities.filter(e=>e.kind==='project-part')).toHaveLength(2);
  expect(semantic.observations.filter(o=>o.source.datasetId==='project-source')).toHaveLength(p.facts.length);
 });
 it('does not confuse separate named parts with UO or allow invented project markers',async()=>{
  const bytes=await source('Projekt: X','Behovsanalys');
  const format=await recognizeWorkbook(bytes);
  if(format?.kind!=='project')throw new Error('PROJECT_FORMAT_REQUIRED');
  const parsed=await format.parse(bytes);
  expect(parsed.issues.filter(x=>x.severity==='error')).toEqual([]);
  const records=canonicalFromProject(parsed,'source');
  expect(records.some(r=>r.scope.axis==='work')).toBe(false);
 });
});
