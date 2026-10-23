import {describe,it,expect} from 'vitest';
import ExcelJS from 'exceljs';
import {formats,recognizeWorkbook,matchWorkbook} from './registry';

async function bytesWithSheet(name:string):Promise<ArrayBuffer>{
 const wb=new ExcelJS.Workbook();
 wb.addWorksheet(name);
 return await wb.xlsx.writeBuffer() as ArrayBuffer;
}

describe('code-defined import formats',()=>{
 it('recognizes the exact UO Tot 2027-30 sheet',async()=>{
  const format=await recognizeWorkbook(await bytesWithSheet('UO Tot 2027-30'));
  expect(format?.id).toBe('uo-budget-2027-30');
  expect(formats).toHaveLength(1);
 });
 it('does not mistake unrelated files for the budget format',async()=>{
  expect(await recognizeWorkbook(await bytesWithSheet('Processarbete'))).toBeNull();
 });
 it('keeps format definitions independent of the user interface',async()=>{
  const wb=new ExcelJS.Workbook(),s=wb.addWorksheet('UO Tot 2027-30');
  s.getCell('B1').value='UO: Test';s.getCell('D11').value=2027;
  s.getCell('B25').value='LOAUL';s.getCell('B26').value={formula:'B25'};
  s.getCell('C26').value='IT timmar (h)';s.getCell('D26').value=42;
  const format=matchWorkbook(wb);
  const result=await format!.parse(await wb.xlsx.writeBuffer() as ArrayBuffer);
  expect(result.facts).toEqual([expect.objectContaining({area:'LOAUL',value:42,source:{cell:'D26'}})]);
 });
});
