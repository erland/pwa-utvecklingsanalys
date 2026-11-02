import {describe,it,expect} from 'vitest';
import ExcelJS from 'exceljs';
import {readDepartmentDemand} from './departmentDemand';

describe('UO-linked department demand import',()=>{
 const workbook=()=>{
  const wb=new ExcelJS.Workbook(),s=wb.addWorksheet('Timmar per avdelning');
  s.getCell('C4').value=2027;s.getCell('D4').value=2028;s.getCell('E4').value=2029;
  s.getCell('A6').value='712*';s.getCell('B6').value='Verksamhetsavdelning';
  s.getCell('C6').value=120;s.getCell('D6').value=0;
  s.getCell('E6').value={formula:'C6+D6',result:0};
  s.getCell('F6').value='Nej';s.getCell('G6').value='Inte förankrad';
  s.getCell('A18').value='713*';s.getCell('B18').value='IT-avdelningen';s.getCell('C18').value=50;
  s.getCell('C16').value={formula:'SUM(C6:C15)',result:0};
  s.getCell('C19').value={formula:'C18',result:0};
  return wb;
 };
 it('keeps UO identity, source cell, year, normalized/raw code and comments',()=>{
  const result=readDepartmentDemand(workbook(),'UO A');
  expect(result.facts).toEqual(expect.arrayContaining([
   expect.objectContaining({uo:'UO A',year:2027,metric:'business_hours',hours:120,departmentCodeRaw:'712*',departmentCode:'712',anchoringStatus:'Nej',comments:['Inte förankrad'],source:{sheet:'Timmar per avdelning',cell:'C6'}}),
   expect.objectContaining({uo:'UO A',year:2027,metric:'it_hours',hours:50,source:{sheet:'Timmar per avdelning',cell:'C18'}})
  ]));
  expect(result.facts.some(f=>f.year===2030)).toBe(false);
  expect(result.facts.some(f=>f.year===2028&&f.hours===0)).toBe(true);
  expect(result.facts.some(f=>f.source.cell==='C16'||f.source.cell==='C19')).toBe(false);
  expect(result.issues).toEqual([expect.objectContaining({code:'INVALID_DEPARTMENT_HOURS',cell:'E6'})]);
 });
 it('reads real UO workbook year headers and ignores cached formula totals',()=>{
  const wb=workbook(),sheet=wb.getWorksheet('Timmar per avdelning')!;
  sheet.getCell('C4').value='Timmar 2027';
  sheet.getCell('D4').value='Timmar 2028';
  sheet.getCell('E4').value='Timmar 2029';
  sheet.getCell('B6').value='·        Verksamhetsavdelning';
  const result=readDepartmentDemand(wb,'UO Operativ');
  expect(result.years).toEqual([2027,2028,2029]);
  expect(result.facts.find(f=>f.source.cell==='C6')).toMatchObject({uo:'UO Operativ',metric:'business_hours',year:2027,hours:120});
  expect(result.facts.find(f=>f.source.cell==='C18')).toMatchObject({metric:'it_hours',hours:50});
  expect(result.facts.some(f=>f.source.cell==='C16'||f.source.cell==='C19')).toBe(false);
 });
 it('does not invent values for absent cells or missing sheet',()=>{
  expect(readDepartmentDemand(new ExcelJS.Workbook(),'UO A')).toEqual({facts:[],issues:[],years:[]});
  expect(readDepartmentDemand(workbook(),'UO B').facts.some(f=>f.source.cell==='D18')).toBe(false);
 });
});
