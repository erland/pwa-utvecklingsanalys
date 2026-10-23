import {describe,it,expect} from 'vitest';
import ExcelJS from 'exceljs';
import {recognizeWorkbook} from './registry';

async function workbook(name:string,value:ExcelJS.CellValue=12){
 const wb=new ExcelJS.Workbook(),sheet=wb.addWorksheet(name);
 sheet.getCell('A1').value='Avdelning';sheet.getCell('B1').value='Antal anställda';
 sheet.getCell('A2').value='Ekonomi';sheet.getCell('B2').value=value;
 return await wb.xlsx.writeBuffer() as ArrayBuffer;
}

describe('two-column annual department headcount',()=>{
 it('recognizes a worksheet with a single explicit year and imports integer counts',async()=>{
  const bytes=await workbook('Bemanning 2027');
  const format=await recognizeWorkbook(bytes);
  expect(format?.id).toBe('department-headcount-sheet-year');
  if(format?.kind!=='table')throw new Error('Wrong format');
  const result=await format.parse(bytes);
  expect(result.issues).toEqual([]);
  expect(result.facts).toEqual([expect.objectContaining({entityKind:'department',entityName:'Ekonomi',measureId:'headcount',year:2027,value:12,source:expect.objectContaining({sheet:'Bemanning 2027',cell:'B2'})})]);
 });
 it('does not infer a year for unnamed snapshots',async()=>{
  expect(await recognizeWorkbook(await workbook('Personal'))).toBeNull();
 });
 it('rejects negative and fractional employee counts',async()=>{
  for(const value of [-1,2.5]){
   const bytes=await workbook('Bemanning 2028',value),format=await recognizeWorkbook(bytes);
   if(format?.kind!=='table')throw new Error('Wrong format');
   expect((await format.parse(bytes)).issues).toEqual(expect.arrayContaining([expect.objectContaining({code:'INVALID_HEADCOUNT',severity:'error'})]));
  }
 });
 it('rejects formulas even if they include a cached result',async()=>{
  const bytes=await workbook('Bemanning 2027',{formula:'6+6',result:12});
  const format=await recognizeWorkbook(bytes);
  if(format?.kind!=='table')throw new Error('Wrong format');
  expect((await format.parse(bytes)).issues).toEqual(expect.arrayContaining([expect.objectContaining({code:'FORMULA_SKIPPED',severity:'error'})]));
 });
 it('rejects ambiguous year labels',async()=>{
  expect(await recognizeWorkbook(await workbook('Bemanning 2027 2028'))).toBeNull();
 });
});
