import ExcelJS from 'exceljs';
import {excelText} from './excelText';
export type MatrixMapping={id:string;sheet:string;headerRow:number;firstRow:number;lastRow:number;measureColumn:number;firstColumn:number;lastColumn:number;activityNames:Record<string,string>;measureNames:Record<string,{id:string;unit:'h'|'SEK';factor:number}>};
export type MatrixFact={sectionId:string;measureId:string;activity:string;year:number;value:number;unit:'h'|'SEK';assumedZero?:boolean;source:{sheet:string;cell:string}};
export type MatrixResult={mapping:MatrixMapping;facts:MatrixFact[];issues:{cell:string;message:string}[];excludedTotals:number};
const normalize=(s:string)=>s.trim().toLocaleLowerCase('sv-SE').replace(/\s+/g,' ');
const cellText=(c:ExcelJS.Cell)=>excelText(c.value);
export const developmentMatrix=(sheet:string):MatrixMapping=>({
 id:'development-management',sheet,headerRow:4,firstRow:5,lastRow:7,measureColumn:3,firstColumn:4,lastColumn:15,
 activityNames:{'utv.':'development','förv.':'maintenance'},
 measureNames:{'it timmar (th)':{id:'it_hours',unit:'h',factor:1000},'v timmar (th)':{id:'business_hours',unit:'h',factor:1000},'omkostnader (mnkr)':{id:'other_cost',unit:'SEK',factor:1000000}}
});
export function validateMatrixMapping(mapping:MatrixMapping):string[]{
 const errors:string[]=[];
 if(!mapping.sheet.trim()||!mapping.id.trim())errors.push('Bladnamn eller sektions-ID saknas');
 for(const n of ['headerRow','firstRow','lastRow','measureColumn','firstColumn','lastColumn'] as const)if(!Number.isSafeInteger(mapping[n])||mapping[n]<1)errors.push('Ogiltig position: '+n);
 if(mapping.lastRow<mapping.firstRow||mapping.lastColumn<mapping.firstColumn)errors.push('Slutposition före startposition');
 if(!Object.entries(mapping.activityNames).length||Object.entries(mapping.activityNames).some(([alias,type])=>!alias.trim()||!['development','maintenance'].includes(type)))errors.push('Ogiltiga aktivitetsalias');
 if(!Object.entries(mapping.measureNames).length||Object.entries(mapping.measureNames).some(([alias,m])=>!alias.trim()||!['it_hours','business_hours','other_cost','consultant_cost'].includes(m.id)||!(m.factor>0&&Number.isFinite(m.factor))||(m.id.endsWith('hours')?m.unit!=='h':m.unit!=='SEK')))errors.push('Ogiltiga måttalias eller enhetsfaktorer');
 return errors;
}
/** Small, deliberately bounded Excel subset: numeric literals and same-sheet cell references with +/-. */
export function numericMatrixCell(sheet:ExcelJS.Worksheet,cell:ExcelJS.Cell,seen=new Set<string>()):number|null{
 const v=cell.value;
 if(typeof v==='number')return Number.isFinite(v)?v:null;
 if(!v||typeof v!=='object'||!('formula'in v)||seen.has(cell.address)||seen.size>=12)return null;
 const formula=String(v.formula??'').trim().replace(/^=/,'');
 const tokens=formula.match(/(?:\$?[A-Z]{1,3}\$?[1-9]\d*|\d+(?:[.,]\d+)?|[+-])/gi);
 if(!tokens||tokens.join('')!==formula.replace(/\s+/g,'')||tokens.length>20)return null;
 seen.add(cell.address);
 let total=0,sign=1,expectValue=true;
 for(const token of tokens){
  if(token==='+'||token==='-'){
   if(expectValue&&total!==0)return null;
   sign=token==='+'?1:-1;expectValue=true;continue;
  }
  if(!expectValue)return null;
  const number=/^\d/.test(token)?Number(token.replace(',','.')):numericMatrixCell(sheet,sheet.getCell(token.replace(/\$/g,'').toUpperCase()),new Set(seen));
  if(number===null||!Number.isFinite(number))return null;
  total+=sign*number;sign=1;expectValue=false;
 }
 return expectValue?null:total;
}
export async function readMatrix(bytes:ArrayBuffer,mapping:MatrixMapping):Promise<MatrixResult>{
 const errors=validateMatrixMapping(mapping);if(errors.length)throw new Error(errors.join('; '));
 const book=new ExcelJS.Workbook();await book.xlsx.load(bytes);const sheet=book.getWorksheet(mapping.sheet);
 if(!sheet)throw new Error('Sektionsblad saknas');
 if(mapping.firstRow<1||mapping.lastRow<mapping.firstRow||mapping.headerRow<1||mapping.firstColumn<1||mapping.lastColumn<mapping.firstColumn)throw new Error('Ogiltigt sektionsintervall');
 const facts:MatrixFact[]=[],issues:MatrixResult['issues']=[];let excludedTotals=0;
 for(let col=mapping.firstColumn;col<=mapping.lastColumn;col++){
  const header=cellText(sheet.getCell(mapping.headerRow,col));
  const year=/\b(20\d{2}|\d{2})\b/.exec(header);const activity=Object.entries(mapping.activityNames).find(([alias])=>normalize(header).startsWith(normalize(alias)))?.[1];
  const isTotal=/^tot\b/i.test(header);
  for(let row=mapping.firstRow;row<=mapping.lastRow;row++){
   const cell=sheet.getCell(row,col);
   if(isTotal){if(cell.value!==null)excludedTotals++;continue}
   if(cell.value===null)continue;
   if(!year||!activity){issues.push({cell:cell.address,message:'Okänd period eller aktivitet'});continue}
   const label=normalize(cellText(sheet.getCell(row,mapping.measureColumn))),measure=mapping.measureNames[label];
   if(!measure){issues.push({cell:cell.address,message:'Okänt sektionsmått: '+label});continue}
   const parsed=numericMatrixCell(sheet,cell);
   if(parsed===null){issues.push({cell:cell.address,message:cell.type===ExcelJS.ValueType.Formula?'Formeln kan inte beräknas säkert':'Ej numeriskt värde'});continue}
   const y=Number(year[1]);const fullYear=y<100?2000+y:y;
   facts.push({sectionId:mapping.id,measureId:measure.id,activity,year:fullYear,value:parsed*measure.factor,unit:measure.unit,source:{sheet:sheet.name,cell:cell.address}});
  }
 }
 // A blank counterpart is a provisional zero, not an imported/locked value.
 // Only infer it for an unambiguous positive source half and an actual blank
 // cell. Never overwrite a formula, malformed cell, or an absent year column.
 const cells=new Map<string,Record<string,ExcelJS.Cell>>();
 for(let col=mapping.firstColumn;col<=mapping.lastColumn;col++){
  const header=cellText(sheet.getCell(mapping.headerRow,col));
  const year=/\\b(20\\d{2}|\\d{2})\\b/.exec(header);
  const activity=Object.entries(mapping.activityNames).find(([alias])=>normalize(header).startsWith(normalize(alias)))?.[1];
  if(!year||!activity||!['development','maintenance'].includes(activity))continue;
  const yr=Number(year[1]),fullYear=yr<100?2000+yr:yr;
  for(let row=mapping.firstRow;row<=mapping.lastRow;row++){
   const measure=mapping.measureNames[normalize(cellText(sheet.getCell(row,mapping.measureColumn)))];
   if(!measure)continue;
   const key=JSON.stringify([fullYear,measure.id]);
   const group=cells.get(key)??{};
   // Ambiguous duplicate mappings must not silently supply defaults.
   if(group[activity])continue;
   group[activity]=sheet.getCell(row,col);cells.set(key,group);
  }
 }
 for(const [key,group] of cells){
  if(!group.development||!group.maintenance)continue;
  const [year,measureId]=JSON.parse(key) as [number,string];
  const existing=facts.filter(f=>f.year===year&&f.measureId===measureId);
  if(existing.length!==1||existing[0].value<=0)continue;
  const missing=existing[0].activity==='development'?'maintenance':'development';
  const cell=group[missing];
  if(!cell||cell.value!==null&&cell.value!==undefined&&cell.value!=='')continue;
  facts.push({...existing[0],activity:missing,value:0,assumedZero:true,
   source:{sheet:sheet.name,cell:cell.address}});
 }
 return {mapping,facts,issues,excludedTotals};
}
