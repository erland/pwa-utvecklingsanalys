import ExcelJS from 'exceljs';
import {parseTable,type TableResult,type TableMapping} from '../tabular';

/**
 * Explicit process-hours XLSX format.
 * Required first-row columns: Process, År, Timmar (in any order).
 * Two-column sheets without an explicit year remain unsupported: never invent a year.
 */
export const processHoursFormat={
 kind:'table' as const,
 id:'process-hours-year',
 label:'Processtimmar per år',
 matches(workbook:ExcelJS.Workbook):boolean{
  return workbook.worksheets.some(sheet=>Boolean(mappingFor(sheet)));
 },
 async parse(bytes:ArrayBuffer):Promise<TableResult>{
  const workbook=new ExcelJS.Workbook();
  await workbook.xlsx.load(bytes);
  const sheets=workbook.worksheets.map(sheet=>({sheet,mapping:mappingFor(sheet)})).filter((x):x is {sheet:ExcelJS.Worksheet;mapping:TableMapping}=>x.mapping!==null);
  if(sheets.length!==1)throw new Error(sheets.length?'Flera blad med processtimmar hittades.':'Kräver kolumnerna Process, År och Timmar i rad 1.');
  return parseTable(bytes,'process-hours',sheets[0].mapping);
 }
};

function mappingFor(sheet:ExcelJS.Worksheet):TableMapping|null{
 const names=new Map<string,string>();
 sheet.getRow(1).eachCell((cell,col)=>{
  const value=cell.value;
  if(typeof value!=='string')return;
  const name=value.trim().toLocaleLowerCase('sv-SE').replace(/\s+/g,' ');
  if(!names.has(name))names.set(name,sheet.getColumn(col).letter);
 });
 const process=names.get('process'),year=names.get('år'),hours=names.get('timmar');
 if(!process||!year||!hours)return null;
 return {sheet:sheet.name,headerRow:1,entityColumn:process,yearColumn:year,valueColumn:hours,entityKind:'process',measureId:'business_hours'};
}
