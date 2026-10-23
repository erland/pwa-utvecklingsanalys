import {describe,it,expect} from 'vitest';
import ExcelJS from 'exceljs';
import {recognizeWorkbook} from './registry';
async function workbook(sheetName:string,amount:ExcelJS.CellValue=120){
 const wb=new ExcelJS.Workbook(),s=wb.addWorksheet(sheetName);
 s.getCell('A1').value='Process';s.getCell('B1').value='Timmar';
 s.getCell('A2').value='Handläggning';s.getCell('B2').value=amount;
 return await wb.xlsx.writeBuffer() as ArrayBuffer;
}
describe('two-column process hours with explicit worksheet year',()=>{
 it('imports a known year with provenance',async()=>{
  const bytes=await workbook('Processer 2027');
  const format=await recognizeWorkbook(bytes);
  expect(format?.id).toBe('process-hours-sheet-year');
  if(format?.kind!=='table')throw new Error('Expected table format');
  const result=await format.parse(bytes);
  expect(result.issues).toEqual([]);
  expect(result.facts).toEqual([expect.objectContaining({entityName:'Handläggning',year:2027,value:120,source:expect.objectContaining({cell:'B2',sheet:'Processer 2027'})})]);
 });
 it('rejects files with no year in worksheet name',async()=>{
  expect(await recognizeWorkbook(await workbook('Processer'))).toBeNull();
 });
 it('rejects formulas without using cached values',async()=>{
  const bytes=await workbook('2028',{formula:'60+60',result:120});
  const format=await recognizeWorkbook(bytes);
  if(format?.kind!=='table')throw new Error('Expected table format');
  expect((await format.parse(bytes)).issues).toEqual(expect.arrayContaining([expect.objectContaining({code:'FORMULA_SKIPPED',severity:'error'})]));
 });
});
