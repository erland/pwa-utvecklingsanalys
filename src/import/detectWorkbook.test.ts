import {describe,it,expect} from 'vitest';
import ExcelJS from 'exceljs';
import {detectWorkbookKind} from './detectWorkbook';

async function file(sheet:string):Promise<ArrayBuffer>{
 const wb=new ExcelJS.Workbook();
 wb.addWorksheet(sheet).getCell('B1').value='Syntetiska testdata';
 return await wb.xlsx.writeBuffer() as ArrayBuffer;
}
describe('XLSX import routing',()=>{
 it('routes the supported UO-budget layout to the existing persisted draft flow',async()=>{
  expect(await detectWorkbookKind(await file('UO Tot 2027-30'))).toBe('budget');
  expect(await detectWorkbookKind(await file('UO Tot 2027–30'))).toBe('budget');
 });
 it('uses tabular review for other XLSX layouts',async()=>{
  expect(await detectWorkbookKind(await file('Processarbete'))).toBe('tabular');
  expect(await detectWorkbookKind(await file('Personal'))).toBe('tabular');
 });
 it('rejects empty workbooks rather than silently guessing',async()=>{
  const wb=new ExcelJS.Workbook();
  await expect(detectWorkbookKind(await wb.xlsx.writeBuffer() as ArrayBuffer)).rejects.toThrow('inga kalkylblad');
 });
});
