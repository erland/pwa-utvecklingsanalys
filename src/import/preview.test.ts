import {describe,it,expect} from 'vitest';
import ExcelJS from 'exceljs';
import {previewMapping,representativeFacts} from './preview';
import {defaultMapping,type Fact} from './uoBudget';

describe('import mapping previews',()=>{
 it('reads live cell values without editing the original workbook',async()=>{
  const wb=new ExcelJS.Workbook();
  const ws=wb.addWorksheet('UO Tot 2027-30');
  ws.getCell('B1').value='Originalt UO';
  ws.getCell('B2').value='Flyttat UO';
  ws.getCell('D11').value=2027;
  ws.getCell('B19').value='LO 1';ws.getCell('C19').value='IT-timmar';
  const buffer=await wb.xlsx.writeBuffer();
  const bytes=Uint8Array.from(buffer as unknown as ArrayLike<number>).buffer;
  const p=await previewMapping(bytes,{...defaultMapping,uoCell:'B2'});
  expect(p.uoCell).toBe('Flyttat UO');
  expect(p.headerRow).toContain('2027');
  expect(p.areaColumn).toContain('LO 1');
  expect(p.labelColumn).toContain('IT-timmar');
  const missing=await previewMapping(bytes,{...defaultMapping,sheet:'Saknas'});
  expect(missing.uoCell).toBe('Bladet saknas');
 });
 it('shows one representative for each imported measure regardless of monthly ordering',()=>{
  const mk=(measure:Fact['measure'],month:number):Fact=>({uo:'UO',area:'LO 1',measure,period:{year:2027,month},value:month,unit:measure.endsWith('hours')?'h':'SEK',source:{sheet:'Test',cell:'D19'}});
  const facts=[...Array.from({length:12},(_,i)=>mk('it_hours',i+1)),mk('business_hours',1),mk('consultant_cost',1),mk('other_cost',1)];
  expect(representativeFacts(facts).map(f=>f.measure)).toEqual(['it_hours','business_hours','consultant_cost','other_cost']);
 });
});
