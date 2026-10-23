import ExcelJS from 'exceljs';
import {parseTable,type TableResult,type TableMapping} from '../tabular';

/** Fixed Excel format: Avdelning, År, Antal anställda. No inferred planning year. */
export const staffHeadcountFormat={
 kind:'table' as const,
 id:'department-headcount-year',
 label:'Antal anställda per avdelning och år',
 matches(workbook:ExcelJS.Workbook):boolean{
  return workbook.worksheets.some(sheet=>mappingFor(sheet)!==null);
 },
 async parse(bytes:ArrayBuffer):Promise<TableResult>{
  const workbook=new ExcelJS.Workbook();
  await workbook.xlsx.load(bytes);
  const matches=workbook.worksheets.map(sheet=>mappingFor(sheet)).filter((mapping):mapping is TableMapping=>mapping!==null);
  if(matches.length!==1)throw new Error(matches.length?'Flera blad med personaluppgifter hittades.':'Kräver kolumnerna Avdelning, År och Antal anställda i rad 1.');
  return parseTable(bytes,'staff-snapshot',matches[0]);
 }
};

function mappingFor(sheet:ExcelJS.Worksheet):TableMapping|null{
 const names=new Map<string,string>();
 sheet.getRow(1).eachCell((cell,col)=>{
  if(typeof cell.value!=='string')return;
  const label=cell.value.trim().toLocaleLowerCase('sv-SE').replace(/\s+/g,' ');
  if(!names.has(label))names.set(label,sheet.getColumn(col).letter);
 });
 const department=names.get('avdelning'),year=names.get('år'),count=names.get('antal anställda');
 if(!department||!year||!count)return null;
 return {sheet:sheet.name,headerRow:1,entityColumn:department,yearColumn:year,valueColumn:count,entityKind:'department',measureId:'headcount'};
}
