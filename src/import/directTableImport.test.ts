import {describe,it,expect,vi} from 'vitest';
import ExcelJS from 'exceljs';

const save=vi.fn(async()=>({}));
vi.mock('./sourceManagement',()=>({approveBudgetSource:vi.fn(),approveTabularSource:save,replaceImportedSource:vi.fn()}));
vi.mock('../domain/semanticStore',()=>({loadSemantic:vi.fn(async()=>({entities:[],observations:[]}))}));
vi.mock('./tabularAdapter',()=>({tableIdentityIssues:vi.fn(()=>[]),importTableFacts:vi.fn()}));
import {importFilesDirectly} from './directImport';

async function file(name:string){
 const wb=new ExcelJS.Workbook(),s=wb.addWorksheet('Processdata');
 s.getCell('A1').value='Process';s.getCell('B1').value='År';s.getCell('C1').value='Timmar';
 s.getCell('A2').value='Handläggning';s.getCell('B2').value=2027;s.getCell('C2').value=15;
 const bytes=await wb.xlsx.writeBuffer();
 return {name,size:bytes.byteLength,arrayBuffer:async()=>bytes} as File;
}
describe('direct import of registered table formats',()=>{
 it('accepts a normal .xlsx name and commits parsed facts',async()=>{
  save.mockClear();
  const result=await importFilesDirectly([await file('processer.xlsx')]);
  expect(result[0]).toEqual(expect.objectContaining({status:'imported',facts:1}));
  expect(save).toHaveBeenCalledOnce();
 });
 it('rejects a non-xlsx extension before persisting',async()=>{
  save.mockClear();
  const result=await importFilesDirectly([await file('processer.txt')]);
  expect(result[0].status).toBe('rejected');
  expect(save).not.toHaveBeenCalled();
 });
});
