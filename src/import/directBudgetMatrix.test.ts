import {describe,it,expect,vi} from 'vitest';
import ExcelJS from 'exceljs';
import {canonicalFromBudget} from '../domain/canonicalImport';
import {prepareDirectImport,importFilesDirectly} from './directImport';

const {approveBudget,replaceSource}=vi.hoisted(()=>({
 approveBudget:vi.fn(async(...args:unknown[])=>{void args;return {};}),
 replaceSource:vi.fn(async()=>({}))
}));
vi.mock('./sourceManagement',()=>({
 approveBudgetSource:approveBudget,replaceImportedSource:replaceSource,approveTabularSource:vi.fn()
}));

async function file(value:ExcelJS.CellValue=0.025,yearHeader='Utv. 27'){
 const wb=new ExcelJS.Workbook(),s=wb.addWorksheet('UO Tot 2027-30');
 s.getCell('B1').value='UO: UO A';s.getCell('D11').value=2027;
 s.getCell('B25').value='LO 1';s.getCell('C26').value='IT timmar (h)';s.getCell('D26').value=42;
 s.getCell('D4').value=yearHeader;s.getCell('E4').value='Förv. 27';
 s.getCell('C5').value='IT timmar (th)';s.getCell('D5').value=value;s.getCell('E5').value=0.017;
 const bytes=await wb.xlsx.writeBuffer();
 return {name:'matrix.xlsx',size:bytes.byteLength,arrayBuffer:async()=>bytes} as File;
}

describe('fixed UO matrix through direct import',()=>{
 it('includes validated activity facts while keeping totals distinct',async()=>{
  approveBudget.mockClear();
  const input=await file(),prepared=await prepareDirectImport(input);
  expect(prepared.result.matrix?.facts).toEqual(expect.arrayContaining([
   expect.objectContaining({activity:'development',year:2027,value:25}),
   expect.objectContaining({activity:'maintenance',year:2027,value:17})
  ]));
  const canonical=canonicalFromBudget(prepared.result,'source-1',true);
  expect(canonical.filter(x=>x.workPart==='uo-activity-matrix')).toHaveLength(2);
  expect(canonical.filter(x=>x.granularity==='total')).toEqual(expect.arrayContaining([expect.objectContaining({value:42})]));
  expect(canonical.filter(x=>x.workPart==='uo-activity-matrix').map(x=>x.value).sort((a,b)=>a-b)).toEqual([17,25]);
  const response=await importFilesDirectly([input]);
  expect(response[0].status).toBe('imported');
  expect(approveBudget).toHaveBeenCalledOnce();
  expect(approveBudget.mock.calls[0][3]).toBe(true);
 });
 it('includes the matrix in source replacement as well',async()=>{
  replaceSource.mockClear();
  const response=await importFilesDirectly([await file()],undefined,'existing-source');
  expect(response[0].status).toBe('imported');
  expect(replaceSource).toHaveBeenCalledOnce();
  expect(replaceSource.mock.calls[0][4]).toEqual(expect.objectContaining({includeMatrix:true}));
 });
 it('rejects unknown matrix headers rather than silently dropping entered values',async()=>{
  const input=await file(0.025,'Okänt 27');
  await expect(prepareDirectImport(input)).rejects.toThrow('Aktivitetsmatrisen');
 });
});
