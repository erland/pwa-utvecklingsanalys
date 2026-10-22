import {describe,it,expect} from 'vitest';
import ExcelJS from 'exceljs';
import {developmentMatrix,readMatrix,validateMatrixMapping} from './matrixSection';
describe('matrix editor mapping',()=>{
 it('rejects unsafe conversion factors and incompatible units',()=>{
  const m=developmentMatrix('S');
  m.measureNames['it timmar (th)']={id:'it_hours',unit:'SEK',factor:1000};
  expect(validateMatrixMapping(m)).toContain('Ogiltiga måttalias eller enhetsfaktorer');
  m.measureNames['it timmar (th)']={id:'it_hours',unit:'h',factor:Infinity};
  expect(validateMatrixMapping(m)).toContain('Ogiltiga måttalias eller enhetsfaktorer');
 });
 it('recognizes arbitrary user-defined labels and applies custom unit scaling',async()=>{
  const w=new ExcelJS.Workbook(),s=w.addWorksheet('Custom');
  s.getCell('D4').value='Nyutv. 29';s.getCell('C5').value='Tekniktid (th)';s.getCell('D5').value=5;
  const mapping=developmentMatrix('Custom');
  mapping.activityNames={'nyutv.':'development'};
  mapping.measureNames={'tekniktid (th)':{id:'it_hours',unit:'h',factor:1000}};
  mapping.firstRow=5;mapping.lastRow=5;mapping.firstColumn=4;mapping.lastColumn=4;
  const result=await readMatrix(await w.xlsx.writeBuffer() as ArrayBuffer,mapping);
  expect(result.facts).toMatchObject([{activity:'development',year:2029,measureId:'it_hours',value:5000}]);
 });
});
