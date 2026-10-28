import ExcelJS from 'exceljs';
import {uoBudget2027_30,type ImportResult} from './uoBudget2027_30';
import {processHoursFormat} from './processHours';
import {processHoursTwoColumnFormat} from './processHoursTwoColumn';
import {staffHeadcountFormat} from './staffHeadcount';
import {staffHeadcountTwoColumnFormat} from './staffHeadcountTwoColumn';
import type {TableResult} from '../tabular';
import type {AllocationPreview} from '../../domain/activityAllocation';
import type {LoDevelopmentOverride} from './uoBudgetCompletion';

/** An isolated, code-defined XLSX import format. Each format owns its matching and parsing rules. */
export type ImportFormat=
 | {kind:'budget';id:string;label:string;matches:(workbook:ExcelJS.Workbook)=>boolean;parse:(bytes:ArrayBuffer)=>Promise<ImportResult>;completion?:(preview:AllocationPreview,overrides:readonly LoDevelopmentOverride[])=>AllocationPreview}
 | {kind:'table';id:string;label:string;matches:(workbook:ExcelJS.Workbook)=>boolean;parse:(bytes:ArrayBuffer)=>Promise<TableResult>};

/** Add/remove entire format definitions here; never infer an ambiguous format. */
export const formats:readonly ImportFormat[]=[uoBudget2027_30,processHoursFormat,processHoursTwoColumnFormat,staffHeadcountFormat,staffHeadcountTwoColumnFormat];

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
