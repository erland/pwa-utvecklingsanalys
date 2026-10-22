import ExcelJS from 'exceljs';
export type WorkbookKind='budget'|'tabular';
/** Identify only the explicitly supported UO worksheet; all other XLSX layouts need review. */
export async function detectWorkbookKind(bytes:ArrayBuffer):Promise<WorkbookKind>{
 const wb=new ExcelJS.Workbook();await wb.xlsx.load(bytes);
 if(!wb.worksheets.length)throw new Error('Excel-filen innehåller inga kalkylblad.');
 return wb.worksheets.some(s=>/^UO Tot 2027[-–]30$/.test(s.name))?'budget':'tabular';
}
