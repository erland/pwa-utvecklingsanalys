import ExcelJS from 'exceljs';
export type MatrixMapping={id:string;sheet:string;headerRow:number;firstRow:number;lastRow:number;measureColumn:number;firstColumn:number;lastColumn:number;activityNames:Record<string,string>;measureNames:Record<string,{id:string;unit:'h'|'SEK';factor:number}>};
export type MatrixFact={sectionId:string;measureId:string;activity:string;year:number;value:number;unit:'h'|'SEK';source:{sheet:string;cell:string}};
export type MatrixResult={mapping:MatrixMapping;facts:MatrixFact[];issues:{cell:string;message:string}[];excludedTotals:number};
const normalize=(s:string)=>s.trim().toLocaleLowerCase('sv-SE').replace(/\s+/g,' ');
const cellText=(c:ExcelJS.Cell)=>{const v=c.value;return typeof v==='string'?v.trim():v&&typeof v==='object'&&'text'in v?String(v.text):''};
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
   if(cell.type===ExcelJS.ValueType.Formula){issues.push({cell:cell.address,message:'Formel kan inte beräknas'});continue}
   if(typeof cell.value!=='number'||!Number.isFinite(cell.value)){issues.push({cell:cell.address,message:'Ej numeriskt värde'});continue}
   const y=Number(year[1]);const fullYear=y<100?2000+y:y;
   facts.push({sectionId:mapping.id,measureId:measure.id,activity,year:fullYear,value:cell.value*measure.factor,unit:measure.unit,source:{sheet:sheet.name,cell:cell.address}});
  }
 }
 return {mapping,facts,issues,excludedTotals};
}
