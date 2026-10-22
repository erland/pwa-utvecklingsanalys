import {it,expect} from 'vitest';
import ExcelJS from 'exceljs';
import {importUoBudget,defaultMapping} from './uoBudget';
it('recognizes named LO areas and reports unexplained numbers',async()=>{
 const w=new ExcelJS.Workbook(),s=w.addWorksheet('UO Tot 2027-30');
 s.getCell('B1').value='UO: X';s.getCell('D11').value=new Date(2027,0,1);
 s.getCell('B19').value='UO Övergripande';s.getCell('C20').value='IT timmar (h)';s.getCell('D20').value=2;
 s.getCell('B25').value='LO AUL';s.getCell('C26').value='IT timmar (h)';s.getCell('D26').value=40;
 s.getCell('B31').value='LO IA';s.getCell('C32').value='V timmar (h)';s.getCell('D32').value=60;
 s.getCell('C33').value='Okänt mått';s.getCell('D33').value=7;
 const bytes=await w.xlsx.writeBuffer() as ArrayBuffer;
 for(const mapping of [undefined,defaultMapping]){
  const result=await importUoBudget(bytes,mapping);
  expect(result.facts.map(f=>[f.area,f.value])).toEqual([['UO Övergripande',2],['LO AUL',40],['LO IA',60]]);
  expect(result.coverage).toMatchObject({candidates:4,imported:3,unresolved:1});
  expect(result.issues).toContainEqual(expect.objectContaining({code:'UNKNOWN_MEASURE',cell:'D33',severity:'error'}));
 }
});
