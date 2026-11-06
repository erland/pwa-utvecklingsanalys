import {describe,expect,it} from 'vitest';
import ExcelJS from 'exceljs';
import {excelText} from './excelText';
import {recognizeWorkbook} from './formats/registry';
import {readDepartmentDemand} from './departmentDemand';

const rich=(...segments:string[]):ExcelJS.CellValue=>({richText:segments.map((text,i)=>({text,font:{bold:i===0}}))});
describe('rich text across imported Excel formats',()=>{
 it('decodes styled runs without evaluating formulas or inventing numbers',()=>{
  expect(excelText(rich('Kontroll','avdelningen'))).toBe('Kontrollavdelningen');
  expect(excelText({formula:'A1',result:'Fiktivt'})).toBe('');
  expect(excelText(0)).toBe('0');
 });
 it('detects UO/project sheets, years, areas and metrics with rich text labels',async()=>{
  const wb=new ExcelJS.Workbook(),s=wb.addWorksheet('UO Tot 2027-30');
  s.getCell('B1').value=rich('Projekt: ','Digitalisering');
  s.getCell('D11').value=2027;
  s.getCell('B25').value=rich('Gemensam ','informationshantering');
  s.getCell('C26').value=rich('IT ','timmar (h)');
  s.getCell('D26').value=40;
  const bytes=await wb.xlsx.writeBuffer() as ArrayBuffer;
  const kind=await recognizeWorkbook(bytes);
  expect(kind?.kind).toBe('project');
  if(kind?.kind!=='project')throw new Error('PROJECT_MISSING');
  const data=await kind.parse(bytes);
  expect(data.uo).toBe('Digitalisering');
  expect(data.facts).toEqual(expect.arrayContaining([expect.objectContaining({area:'Gemensam informationshantering',value:40})]));
 });
 it('reads rich-text department headers, code and name without requiring a fixed row number',()=>{
  const wb=new ExcelJS.Workbook(),s=wb.addWorksheet('Timmar per avdelning');
  s.getCell('C4').value=rich('Timmar ','2027');
  s.getCell('A12').value=rich('721','*');
  s.getCell('B12').value=rich('Kontroll','avdelningen');
  s.getCell('C12').value=12;
  const parsed=readDepartmentDemand(wb,'A');
  expect(parsed.years).toEqual([2027]);
  expect(parsed.facts).toEqual([expect.objectContaining({departmentCode:'721',departmentName:'Kontrollavdelningen',hours:12})]);
 });
 it('recognizes tabular headers and entity names with rich text',async()=>{
  const wb=new ExcelJS.Workbook(),s=wb.addWorksheet('Data');
  s.getCell('A1').value=rich('Pro','cess');
  s.getCell('B1').value=rich('Å','r');
  s.getCell('C1').value=rich('Tim','mar');
  s.getCell('A2').value=rich('Klar','ering');
  s.getCell('B2').value=2027;s.getCell('C2').value=12;
  const bytes=await wb.xlsx.writeBuffer() as ArrayBuffer;
  const format=await recognizeWorkbook(bytes);
  expect(format?.kind).toBe('table');
  if(format?.kind!=='table')throw new Error('TABLE_MISSING');
  const parsed=await format.parse(bytes);
  expect(parsed.facts).toEqual([expect.objectContaining({entityName:'Klarering',value:12})]);
 });
});
