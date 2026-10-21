import ExcelJS from 'exceljs';
import type {EntityKind} from '../domain/semantic';
export type TableProfile='process-hours'|'staff-snapshot'|'generic';
export type TableMapping={sheet:string;headerRow:number;entityColumn:string;yearColumn:string;valueColumn:string;entityKind:EntityKind;measureId:string};
export type TableFact={entityName:string;entityKind:EntityKind;measureId:string;value:number;year:number;source:{sheet:string;cell:string}};
export type TableIssue={code:string;severity:'error'|'warning';row?:number;message:string};
export type TableResult={profile:TableProfile;mapping:TableMapping;facts:TableFact[];issues:TableIssue[];sheets:string[]};
const text=(v:ExcelJS.CellValue):string=>typeof v==='string'?v.trim():typeof v==='number'?String(v):v&&typeof v==='object'&&'text'in v?String(v.text).trim():'';
export async function inspectTable(bytes:ArrayBuffer):Promise<{sheets:string[];suggested:TableProfile;mapping:TableMapping}>{
 const wb=new ExcelJS.Workbook();await wb.xlsx.load(bytes);const sheets=wb.worksheets.map(s=>s.name);
 const sheet=wb.worksheets.find(s=>/process|verksamhet|arbetad tid/i.test(s.name))??wb.worksheets.find(s=>/personal|bemanning|fte|anställ/i.test(s.name))??wb.worksheets[0];
 if(!sheet)throw new Error('Arbetsboken innehåller inga kalkylblad.');
 const headers=sheet.getRow(1).values as ExcelJS.CellValue[];
 const find=(pattern:RegExp)=>{for(let i=1;i<headers.length;i++){if(pattern.test(text(headers[i])))return sheet.getColumn(i).letter}return ''};
 const isProcess=/process|verksamhet|arbetad tid/i.test(sheet.name)||headers.some(h=>/process/i.test(text(h)));
 const isStaff=/personal|bemanning|fte|anställ/i.test(sheet.name)||headers.some(h=>/fte|årsarbetskraft|antal anställda/i.test(text(h)));
 const suggested:TableProfile=isProcess?'process-hours':isStaff?'staff-snapshot':'generic';
 const measureId=suggested==='staff-snapshot'?(headers.some(h=>/fte|årsarbetskraft/i.test(text(h)))?'fte':'headcount'):'business_hours';
 return {sheets,suggested,mapping:{sheet:sheet.name,headerRow:1,entityColumn:find(/process|avdelning|enhet|objekt|namn/i)||'A',yearColumn:find(/^år$|year|period/i)||'B',valueColumn:find(/timmar|fte|årsarbetskraft|antal|värde|value/i)||'C',entityKind:suggested==='process-hours'?'process':'department',measureId}};
}
export async function parseTable(bytes:ArrayBuffer,profile:TableProfile,mapping:TableMapping):Promise<TableResult>{
 const issues:TableIssue[]=[],wb=new ExcelJS.Workbook();await wb.xlsx.load(bytes);const sheet=wb.getWorksheet(mapping.sheet);
 if(!sheet)return {profile,mapping,facts:[],sheets:wb.worksheets.map(s=>s.name),issues:[{code:'SHEET_NOT_FOUND',severity:'error',message:'Valt blad saknas.'}]};
 if(!Number.isInteger(mapping.headerRow)||mapping.headerRow<1||!['business_hours','it_hours','headcount','fte'].includes(mapping.measureId)||!['process','department','organization'].includes(mapping.entityKind))
  return {profile,mapping,facts:[],sheets:wb.worksheets.map(s=>s.name),issues:[{code:'INVALID_MAPPING',severity:'error',message:'Mappningens mått, objekttyp eller rubrikrad är ogiltig.'}]};
 const facts:TableFact[]=[];
 for(let r=mapping.headerRow+1;r<=sheet.rowCount;r++){
  const row=sheet.getRow(r),name=text(row.getCell(mapping.entityColumn).value);
  const valueCell=row.getCell(mapping.valueColumn),yearCell=row.getCell(mapping.yearColumn);
  if(!name&&!text(valueCell.value))continue;
  if(!name){issues.push({code:'MISSING_ENTITY',severity:'error',row:r,message:'Objektnamn saknas.'});continue}
  const rawYear=yearCell.value;const year=rawYear instanceof Date?rawYear.getFullYear():Number(text(rawYear));
  if(!Number.isInteger(year)||year<2000||year>2100){issues.push({code:'INVALID_YEAR',severity:'error',row:r,message:'År saknas eller är ogiltigt.'});continue}
  const v=valueCell.value;
  if(valueCell.type===ExcelJS.ValueType.Formula){issues.push({code:'FORMULA_SKIPPED',severity:'warning',row:r,message:'Formelvärde har inte importerats.'});continue}
  if(typeof v!=='number'||!Number.isFinite(v)){issues.push({code:'INVALID_VALUE',severity:'error',row:r,message:'Värde saknas eller är inte numeriskt.'});continue}
  if((mapping.measureId==='headcount'||mapping.measureId==='fte')&&v<0){issues.push({code:'NEGATIVE_STAFF',severity:'error',row:r,message:'Bemanning kan inte vara negativ.'});continue}
  facts.push({entityName:name,entityKind:mapping.entityKind,measureId:mapping.measureId,value:v,year,source:{sheet:sheet.name,cell:valueCell.address}});
 }
 if(!facts.length)issues.push({code:'NO_FACTS',severity:'error',message:'Inga giltiga detaljrader hittades.'});
 return {profile,mapping,facts,issues,sheets:wb.worksheets.map(s=>s.name)};
}
