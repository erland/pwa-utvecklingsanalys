import ExcelJS from 'exceljs';
import type {Mapping,Fact} from './uoBudget';

function display(cell:ExcelJS.Cell):string {
 const v=cell.value;
 if(v===null||v===undefined)return '(tom)';
 if(v instanceof Date)return v.toISOString().slice(0,10);
 if(typeof v==='object'){
  if('formula'in v)return v.result===undefined?'Formel (saknar beräknat värde)':String(v.result)+' (formel)';
  if('text'in v)return String(v.text);
  if('richText'in v)return v.richText.map(x=>x.text).join('');
  return JSON.stringify(v);
 }
 return String(v);
}
export async function previewMapping(bytes:ArrayBuffer,mapping:Mapping):Promise<Record<keyof Mapping,string>>{
 const wb=new ExcelJS.Workbook();await wb.xlsx.load(bytes);
 const sheet=wb.getWorksheet(mapping.sheet);
 if(!sheet)return {sheet:'Bladet saknas',uoCell:'Bladet saknas',headerRow:'Bladet saknas',areaColumn:'Bladet saknas',labelColumn:'Bladet saknas',startRow:'Bladet saknas'};
 const safe=(row:number,col:number)=>row>=1&&col>=1&&row<=1048576&&col<=16384?display(sheet.getCell(row,col)):'Ogiltig position';
 let uo='Ogiltig cell';
 try{uo=display(sheet.getCell(mapping.uoCell))}catch{ /* Invalid cell ref */ }
 return {sheet:sheet.name+' ('+sheet.rowCount+' rader)',uoCell:uo,headerRow:'D: '+safe(mapping.headerRow,4),areaColumn:'Rad '+mapping.startRow+': '+safe(mapping.startRow,mapping.areaColumn),labelColumn:'Rad '+mapping.startRow+': '+safe(mapping.startRow,mapping.labelColumn),startRow:'B: '+safe(mapping.startRow,2)+' · C: '+safe(mapping.startRow,3)};
}
export function representativeFacts(facts:Fact[]):Fact[]{
 const unique=new Map<Fact['measure'],Fact>();
 for(const f of facts)if(!unique.has(f.measure))unique.set(f.measure,f);
 return [...unique.values()];
}
