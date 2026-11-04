import ExcelJS from 'exceljs';
import {importUoBudget,UO_BUDGET_SHEET,type ImportResult} from './uoBudget2027_30';

/** Explicit project marker prevents accidental reinterpretation of ordinary UO files. */
export const projectBudget2027_30={
 kind:'project' as const,
 id:'project-budget-2027-30',
 label:'Projektbudget 2027–2030',
 matches(book:ExcelJS.Workbook):boolean{
  return book.worksheets.some(sheet=>UO_BUDGET_SHEET.test(sheet.name)&&
   /^Projekt\s*:\s*\S/i.test(String(sheet.getCell('B1').value??'').trim()));
 },
 async parse(bytes:ArrayBuffer):Promise<ImportResult>{
  const result=await importUoBudget(bytes,undefined,null,true);
  if(!result.uo||/^Projekt\s*:/i.test(result.uo))throw new Error('Projektnamn saknas i B1.');
  return {...result,profile:'project-budget-2027-v1'};
 }
};
