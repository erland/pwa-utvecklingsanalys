import {describe,it,expect} from 'vitest';
import ExcelJS from 'exceljs';
import {prepareDirectImport} from '../import/directImport';
import {canonicalFromBudget} from './canonicalImport';
import {importBudgetFacts} from './importAdapter';
import {emptySemantic} from './semantic';
import {emptyCanonical,summarizeCanonical,validateCanonical} from './canonical';
import {importedLoActivityLocks} from './importedLoLocks';

async function importedWorkbook(options:{loActivity?:number;maintenance?:number;second?:boolean;duplicate?:boolean;badHeader?:boolean}={}){
 const wb=new ExcelJS.Workbook(),budget=wb.addWorksheet('UO Tot 2027-30');
 budget.getCell('B1').value='UO: UO A';budget.getCell('D11').value=2027;
 budget.getCell('B25').value='LO 1';budget.getCell('C26').value='IT timmar (h)';budget.getCell('D26').value=40;
 if(options.second){budget.getCell('B31').value='LO 2';budget.getCell('C32').value='IT timmar (h)';budget.getCell('D32').value=60;}
 budget.getCell('D4').value='Utv. 27';budget.getCell('E4').value='Förv. 27';
 budget.getCell('C5').value='IT timmar (th)';budget.getCell('D5').value=0.05;budget.getCell('E5').value=0.05;
 if(options.loActivity!==undefined){
  const sheet=wb.addWorksheet('LO Aktiviteter 2027-2030');
  ['LO','År','Mått','Utveckling (h)','Förvaltning (h)'].forEach((value,i)=>sheet.getCell(1,i+1).value=value);
  if(options.badHeader)sheet.getCell('E1').value='Felaktig rubrik';
  ['LO 1',2027,'it_hours',options.loActivity,options.maintenance??20].forEach((value,i)=>sheet.getCell(2,i+1).value=value);
  if(options.duplicate)['LO 1',2027,'it_hours',options.loActivity,options.maintenance??20].forEach((value,i)=>sheet.getCell(3,i+1).value=value);
 }
 const bytes=await wb.xlsx.writeBuffer();
 return {name:'final-review.xlsx',size:bytes.byteLength,arrayBuffer:async()=>bytes} as File;
}
describe('DEV-190 real XLSX import safety regression',()=>{
 it('imports a locked LO pair as source-linked original observations in both representations',async()=>{
  const {result}=await prepareDirectImport(await importedWorkbook({loActivity:20,maintenance:20,second:true}));
  const canonical={...emptyCanonical(),records:canonicalFromBudget(result,'ds',true)};
  expect(validateCanonical(canonical)).toEqual([]);
  expect(summarizeCanonical(canonical,'work',['it_hours'],'all').value).toBe(100);
  const lock=importedLoActivityLocks(canonical,{datasetId:'ds',uoId:'uo:UO%20A',metric:'it_hours',year:2027});
  expect(lock).toEqual({locks:[{loId:'lo:UO%20A:LO%201',development:20,maintenance:20}],incompleteLoIds:[]});
  const semantic=importBudgetFacts(emptySemantic(),result,'ds','final-review.xlsx',true);
  const originalParts=semantic.observations.filter(o=>o.sectionId==='lo-activity');
  expect(originalParts).toHaveLength(2);
  expect(originalParts.map(o=>o.value)).toEqual([20,20]);
  expect(originalParts.every(o=>o.source.datasetId==='ds'&&o.source.sheet==='LO Aktiviteter 2027-2030')).toBe(true);
 });
 it('rejects malformed or duplicate source LO activity rows before import approval',async()=>{
  await expect(prepareDirectImport(await importedWorkbook({loActivity:20,maintenance:20,duplicate:true}))).rejects.toThrow();
  await expect(prepareDirectImport(await importedWorkbook({loActivity:20,maintenance:20,badHeader:true}))).rejects.toThrow();
 });
 it('rejects mismatched activity amounts in both canonical and semantic staging, without writes',async()=>{
  const {result}=await prepareDirectImport(await importedWorkbook({loActivity:30,maintenance:20}));
  const semantic=emptySemantic(),snapshot=JSON.stringify(semantic);
  expect(()=>canonicalFromBudget(result,'ds',true)).toThrow('LO_ACTIVITY_TOTAL_MISMATCH');
  expect(()=>importBudgetFacts(semantic,result,'ds','final-review.xlsx',true)).toThrow('LO_ACTIVITY_TOTAL_MISMATCH');
  expect(JSON.stringify(semantic)).toBe(snapshot);
 });
 it('without the optional LO sheet remains compatible and does not create locks',async()=>{
  const {result}=await prepareDirectImport(await importedWorkbook({second:true}));
  const canonical={...emptyCanonical(),records:canonicalFromBudget(result,'ds',true)};
  expect(importedLoActivityLocks(canonical,{datasetId:'ds',uoId:'uo:UO%20A',metric:'it_hours',year:2027}).locks).toEqual([]);
 });
});
