import {describe,it,expect} from 'vitest';
import ExcelJS from 'exceljs';
import {developmentMatrix,readMatrix} from './matrixSection';
import {importUoBudget} from './uoBudget';
import {importBudgetFacts} from '../domain/importAdapter';
import {emptySemantic} from '../domain/semantic';
import {analyze} from '../analytics/query';
describe('independent matrix sections',()=>{
 it('converts thousands of hours and millions of SEK and ignores total columns',async()=>{
  const w=new ExcelJS.Workbook(),s=w.addWorksheet('UO Tot 2027-30');
  s.getCell('B1').value='UO: A';s.getCell('D11').value=new Date(2027,0,1);
  s.getCell('B25').value='LO AUL';s.getCell('C26').value='IT timmar (h)';s.getCell('D26').value=42;
  s.getCell('D4').value='Utv. 27';s.getCell('E4').value='Förv. 27';s.getCell('F4').value='Tot 27';
  s.getCell('C5').value='IT timmar (th)';s.getCell('D5').value=2;s.getCell('E5').value=3;s.getCell('F5').value={formula:'SUM(D5:E5)',result:5};
  s.getCell('C7').value='Omkostnader (Mnkr)';s.getCell('D7').value=1.5;
  const bytes=await w.xlsx.writeBuffer() as ArrayBuffer;
  const matrix=await readMatrix(bytes,developmentMatrix(s.name));
  expect(matrix.facts.map(f=>f.value)).toEqual([2000,1500000,3000]);
  expect(matrix.excludedTotals).toBe(1);
  const parsed=await importUoBudget(bytes);
  const data=importBudgetFacts(emptySemantic(),parsed,'source','a.xlsx',true);
  expect(data.observations.filter(o=>o.kind==='subset')).toHaveLength(3);
  expect(data.observations.find(o=>o.activity==='maintenance')?.value).toBe(3000);
  expect(analyze(data,{measureId:'all_hours',groupBy:'uo'}).total).toBe(42);
 });
 it('respects configurable header and row positions',async()=>{
  const w=new ExcelJS.Workbook(),s=w.addWorksheet('Tabell');
  s.getCell('D9').value='Utv. 28';s.getCell('C10').value='IT timmar (th)';s.getCell('D10').value=4;
  const bytes=await w.xlsx.writeBuffer() as ArrayBuffer;
  const result=await readMatrix(bytes,{...developmentMatrix(s.name),headerRow:9,firstRow:10,lastRow:10,firstColumn:4,lastColumn:4});
  expect(result.facts).toMatchObject([{year:2028,activity:'development',value:4000}]);
 });
});
