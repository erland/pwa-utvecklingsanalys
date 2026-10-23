import {describe,it,expect} from 'vitest';
import ExcelJS from 'exceljs';
import {recognizeWorkbook} from './registry';

async function workbook(headers:string[],row:(string|number)[]){
 const wb=new ExcelJS.Workbook(),sheet=wb.addWorksheet('Bemanning');
 headers.forEach((h,i)=>{sheet.getCell(1,i+1).value=h});
 row.forEach((v,i)=>{sheet.getCell(2,i+1).value=v});
 return await wb.xlsx.writeBuffer() as ArrayBuffer;
}
describe('department headcount XLSX format',()=>{
 it('recognizes and parses year, department and employee count',async()=>{
  const bytes=await workbook(['Antal anställda','Avdelning','År'],[25,'Ekonomi',2027]);
  const format=await recognizeWorkbook(bytes);
  expect(format?.id).toBe('department-headcount-year');
  if(format?.kind!=='table')throw new Error('Not a table');
  const result=await format.parse(bytes);
  expect(result.issues.filter(i=>i.severity==='error')).toEqual([]);
  expect(result.facts).toEqual([expect.objectContaining({entityKind:'department',entityName:'Ekonomi',measureId:'headcount',year:2027,value:25})]);
 });
 it('refuses a two-column sheet without year',async()=>{
  expect(await recognizeWorkbook(await workbook(['Avdelning','Antal anställda'],['Ekonomi',25]))).toBeNull();
 });
 it('rejects negative staffing counts',async()=>{
  const bytes=await workbook(['Avdelning','År','Antal anställda'],['Ekonomi',2027,-2]);
  const format=await recognizeWorkbook(bytes);
  if(format?.kind!=='table')throw new Error('Not a table');
  expect((await format.parse(bytes)).issues).toEqual(expect.arrayContaining([expect.objectContaining({code:'NEGATIVE_STAFF',severity:'error'})]));
 });
});