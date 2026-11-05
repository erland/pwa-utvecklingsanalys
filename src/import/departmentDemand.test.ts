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
 it('imports 721* Kontrollavdelningen on previously skipped row 17',()=>{
  const wb=workbook(),sheet=wb.getWorksheet('Timmar per avdelning')!;
  sheet.getCell('A17').value='721*';
  sheet.getCell('B17').value='Kontrollavdelningen';
  sheet.getCell('C17').value=75;
  sheet.getCell('D17').value=0;
  const result=readDepartmentDemand(wb,'UO Klarering');
  expect(result.facts).toEqual(expect.arrayContaining([
   expect.objectContaining({uo:'UO Klarering',departmentCodeRaw:'721*',departmentCode:'721',
    departmentName:'Kontrollavdelningen',metric:'business_hours',year:2027,hours:75,
    source:{sheet:'Timmar per avdelning',cell:'C17'}}),
   expect.objectContaining({departmentCode:'721',year:2028,hours:0})
  ]));
  expect(result.facts.some(f=>f.source.cell==='C16'||f.source.cell==='C19')).toBe(false);
 });
 it('recognizes moved IT department and ignores totals, headers and uncoded rows',()=>{
  const wb=workbook(),sheet=wb.getWorksheet('Timmar per avdelning')!;
  sheet.getCell('A18').value=null;
  sheet.getCell('B18').value=null;
  sheet.getCell('C18').value=null;
  sheet.getCell('A21').value='713*';
  sheet.getCell('B21').value='IT-avdelningen';
  sheet.getCell('C21').value=60;
  sheet.getCell('B22').value='Totalt';
  sheet.getCell('C22').value=999;
  sheet.getCell('A23').value='SUMMA';
  sheet.getCell('B23').value='Alla avdelningar';
  sheet.getCell('C23').value=999;
  const result=readDepartmentDemand(wb,'UO Klarering');
  expect(result.facts.find(f=>f.source.cell==='C21')).toMatchObject({metric:'it_hours',hours:60,departmentCode:'713'});
  expect(result.facts.some(f=>f.source.cell==='C22'||f.source.cell==='C23')).toBe(false);
 });
 it('reads Test.xlsx row 12 Kontrollavdelningen when numeric hours are entered',()=>{
  const wb=workbook(),s=wb.getWorksheet('Timmar per avdelning')!;
  s.getCell('C4').value='Timmar 2027';s.getCell('D4').value='Timmar 2028';s.getCell('E4').value='Timmar 2029';
  s.getCell('A12').value='721*';
  s.getCell('B12').value='·\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0 Kontrollavdelningen';
  s.getCell('C12').value=75;s.getCell('D12').value=0;s.getCell('E12').value=110;
  const parsed=readDepartmentDemand(wb,'UO A');
  expect(parsed.facts.filter(f=>f.departmentCode==='721')).toMatchObject([
   {year:2027,hours:75,metric:'business_hours',source:{sheet:'Timmar per avdelning',cell:'C12'}},
   {year:2028,hours:0,metric:'business_hours',source:{sheet:'Timmar per avdelning',cell:'D12'}},
   {year:2029,hours:110,metric:'business_hours',source:{sheet:'Timmar per avdelning',cell:'E12'}}
  ]);
  expect(parsed.rows.find(r=>r.row===12)).toMatchObject({code:'721*',imported:3,skipped:0,status:'imported'});
 });
 it('reports rows with missing, invalid and formula hours without counting them as imported',()=>{
  const wb=workbook(),s=wb.getWorksheet('Timmar per avdelning')!;
  s.getCell('A12').value='721*';s.getCell('B12').value='Kontrollavdelningen';
  const blank=readDepartmentDemand(wb,'UO A');
  expect(blank.rows.find(r=>r.row===12)).toMatchObject({imported:0,status:'no-hours'});
  s.getCell('C12').value={formula:'20+40',result:60};
  s.getCell('D12').value=5;
  const formula=readDepartmentDemand(wb,'UO A');
  expect(formula.rows.find(r=>r.row===12)).toMatchObject({imported:1,skipped:1,status:'partial'});
  expect(formula.issues).toContainEqual(expect.objectContaining({code:'INVALID_DEPARTMENT_HOURS',cell:'C12'}));
  s.getCell('A12').value='721 *';
  const invalid=readDepartmentDemand(wb,'UO A');
  expect(invalid.rows.find(r=>r.row===12)).toMatchObject({imported:0,status:'invalid-code'});
 });
 it('does not invent values for absent cells or missing sheet',()=>{
  expect(readDepartmentDemand(new ExcelJS.Workbook(),'UO A')).toEqual({facts:[],issues:[],years:[],rows:[]});
  expect(readDepartmentDemand(workbook(),'UO B').facts.some(f=>f.source.cell==='D18')).toBe(false);
 });
});
