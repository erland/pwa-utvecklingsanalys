import {describe,it,expect} from 'vitest';
import ExcelJS from 'exceljs';
import {recognizeWorkbook} from './registry';

async function sheet(headers:string[],values:(string|number)[]=[]){
 const wb=new ExcelJS.Workbook(),s=wb.addWorksheet('Arbetstid');
 headers.forEach((h,i)=>{s.getRow(1).getCell(i+1).value=h});
 values.forEach((v,i)=>{s.getRow(2).getCell(i+1).value=v});
 return await wb.xlsx.writeBuffer() as ArrayBuffer;
}
describe('annual process-hours import format',()=>{
 it('recognizes and parses Process / År / Timmar',async()=>{
  const bytes=await sheet(['Process','År','Timmar'],['Handläggning',2027,75]);
  const format=await recognizeWorkbook(bytes);
  expect(format?.kind).toBe('table');
  expect(format?.id).toBe('process-hours-year');
  if(format?.kind!=='table')throw new Error('wrong format');
  const result=await format.parse(bytes);
  expect(result.facts).toEqual([expect.objectContaining({entityName:'Handläggning',entityKind:'process',measureId:'business_hours',year:2027,value:75})]);
 });
 it('does not invent a year for two-column sheets',async()=>{
  expect(await recognizeWorkbook(await sheet(['Process','Timmar'],['Handläggning',75]))).toBeNull();
 });
 it('rejects invalid year and nonnumeric values',async()=>{
  const bytes=await sheet(['Process','År','Timmar'],['Handläggning',2027,'ej tal']);
  const format=await recognizeWorkbook(bytes);
  if(format?.kind!=='table')throw new Error('wrong format');
  expect((await format.parse(bytes)).issues.some(i=>i.severity==='error')).toBe(true);
 });
});
