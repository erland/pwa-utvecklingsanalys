import {describe,it,expect} from 'vitest';
import ExcelJS from 'exceljs';
import {prepareDirectImport} from './directImport';

async function file(sheetName:string,kind:'valid'|'bad'='valid'):Promise<File>{
 const wb=new ExcelJS.Workbook(),sheet=wb.addWorksheet(sheetName);
 sheet.getCell('B1').value='UO: UO A';
 sheet.getCell('D11').value=2027;
 sheet.getCell('B25').value='LOAUL';
 sheet.getCell('B26').value={formula:'B25'};
 sheet.getCell('C26').value='IT timmar (h)';
 sheet.getCell('D26').value=kind==='valid'?42:'abc';
 const bytes=await wb.xlsx.writeBuffer();
 return {name:'test.xlsx',size:bytes.byteLength,arrayBuffer:async()=>bytes} as File;
}
describe('automated import preparation',()=>{
 it('accepts a known UO file and resolves direct Excel references',async()=>{
  const prepared=await prepareDirectImport(await file('UO Tot 2027-30'));
  expect(prepared.formatLabel).toBe('UO Tot 2027-30');
  expect(prepared.result.facts).toEqual([expect.objectContaining({area:'LOAUL',value:42,source:expect.objectContaining({cell:'D26'})})]);
  expect(prepared.result.uo).toBe('UO A');
 });
 it('rejects unknown workbook layouts instead of guessing',async()=>{
  await expect(prepareDirectImport(await file('Unknown format'))).rejects.toThrow('Okänt Excel-format');
 });
 it('rejects known files with no importable numeric facts',async()=>{
  await expect(prepareDirectImport(await file('UO Tot 2027-30','bad'))).rejects.toThrow('Inga importbara detaljvärden');
 });
});
