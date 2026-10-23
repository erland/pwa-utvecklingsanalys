import ExcelJS from 'exceljs';
import {importUoBudget,matchesUoBudget2027_30,type ImportResult} from './uoBudget2027_30';

/** An isolated, code-defined XLSX import format. Each format owns its matching and parsing rules. */
export type ImportFormat={
 id:string;
 label:string;
 matches:(workbook:ExcelJS.Workbook)=>boolean;
 parse:(bytes:ArrayBuffer)=>Promise<ImportResult>;
};

export const uoBudget2027_30:ImportFormat={
 id:'uo-budget-2027-30',
 label:'UO Tot 2027-30',
 matches:matchesUoBudget2027_30,
 parse:bytes=>importUoBudget(bytes)
};

/** Add/remove entire format definitions here; never infer an ambiguous format. */
export const formats:readonly ImportFormat[]=[uoBudget2027_30];

export function matchWorkbook(workbook:ExcelJS.Workbook):ImportFormat|null{
 const matches=formats.filter(format=>format.matches(workbook));
 if(matches.length>1)throw new Error('Excel-filen matchar flera importformat. Import avbruten.');
 return matches[0]??null;
}

export async function recognizeWorkbook(bytes:ArrayBuffer):Promise<ImportFormat|null>{
 const wb=new ExcelJS.Workbook();
 await wb.xlsx.load(bytes);
 if(!wb.worksheets.length)throw new Error('Excel-filen innehåller inga kalkylblad.');
 return matchWorkbook(wb);
}
