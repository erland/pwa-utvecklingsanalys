import {describe,it,expect} from 'vitest';
import ExcelJS from 'exceljs';
import {LO_ACTIVITY_SHEET,readLoActivitySheet} from './loActivitySheet';
describe('DEV-187 explicit LO activity sheet',()=>{
 it('is optional and does not infer LO splits from the old budget layout',()=>{
  const book=new ExcelJS.Workbook();book.addWorksheet('UO Tot 2027-30');
  expect(readLoActivitySheet(book)).toEqual({facts:[],issues:[]});
 });
 it('parses complete original pairs with exact provenance, including zero',()=>{
  const book=new ExcelJS.Workbook(),sheet=book.addWorksheet(LO_ACTIVITY_SHEET);
  ['LO','År','Mått','Utveckling (h)','Förvaltning (h)'].forEach((h,i)=>sheet.getCell(1,i+1).value=h);
  ['LO 1',2027,'it_hours',0,40].forEach((v,i)=>sheet.getCell(2,i+1).value=v);
  expect(readLoActivitySheet(book)).toEqual({issues:[],facts:[{area:'LO 1',year:2027,metric:'it_hours',development:0,maintenance:40,source:{sheet:LO_ACTIVITY_SHEET,developmentCell:'D2',maintenanceCell:'E2'}}]});
 });
 it('rejects incomplete, duplicate, formula and invalid rows',()=>{
  const book=new ExcelJS.Workbook(),sheet=book.addWorksheet(LO_ACTIVITY_SHEET);
  ['LO','År','Mått','Utveckling (h)','Förvaltning (h)'].forEach((h,i)=>sheet.getCell(1,i+1).value=h);
  ['LO 1',2027,'it_hours',10,20].forEach((v,i)=>sheet.getCell(2,i+1).value=v);
  ['LO 1',2027,'it_hours',10,20].forEach((v,i)=>sheet.getCell(3,i+1).value=v);
  ['LO 2',2027,'it_hours',10,null].forEach((v,i)=>sheet.getCell(4,i+1).value=v);
  ['LO 3',2027,'it_hours',{formula:'1+1',result:2},20].forEach((v,i)=>sheet.getCell(5,i+1).value=v);
  const result=readLoActivitySheet(book);
  expect(result.facts).toHaveLength(1);
  expect(result.issues.map(i=>i.cell)).toEqual(['A3','E4','D5']);
 });
});
