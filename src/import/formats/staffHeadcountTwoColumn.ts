import ExcelJS from 'exceljs';
import type {TableResult,TableFact,TableIssue,TableMapping} from '../tabular';

/** Two-column department headcount is importable only when the sheet explicitly declares a single year. */
export const staffHeadcountTwoColumnFormat={
 kind:'table' as const,
 id:'department-headcount-sheet-year',
 label:'Avdelning och Antal anställda (år i bladnamn)',
 matches(workbook:ExcelJS.Workbook):boolean{return workbook.worksheets.some(eligible);},
 async parse(bytes:ArrayBuffer):Promise<TableResult>{
  const wb=new ExcelJS.Workbook();await wb.xlsx.load(bytes);
  const candidates=wb.worksheets.filter(eligible);
  if(candidates.length!==1)throw new Error('Förväntade exakt ett blad med Avdelning och Antal anställda och år i bladnamnet.');
  const sheet=candidates[0],year=sheetYear(sheet.name)!;
  const facts:TableFact[]=[],issues:TableIssue[]=[];
  for(let r=2;r<=sheet.rowCount;r++){
   const nameCell=sheet.getCell(r,1),valueCell=sheet.getCell(r,2);
   const name=typeof nameCell.value==='string'?nameCell.value.trim():'';
   if(!name&&valueCell.value==null)continue;
   if(!name){issues.push({code:'MISSING_ENTITY',severity:'error',row:r,message:'Avdelningsnamn saknas.'});continue;}
   if(valueCell.type===ExcelJS.ValueType.Formula){issues.push({code:'FORMULA_SKIPPED',severity:'error',row:r,message:'Formelvärde kan inte importeras automatiskt.'});continue;}
   if(typeof valueCell.value!=='number'||!Number.isFinite(valueCell.value)){
    issues.push({code:'INVALID_VALUE',severity:'error',row:r,message:'Antal anställda måste vara ett numeriskt värde.'});continue;
   }
   if(!Number.isInteger(valueCell.value)||valueCell.value<0){
    issues.push({code:'INVALID_HEADCOUNT',severity:'error',row:r,message:'Antal anställda måste vara ett icke-negativt heltal.'});continue;
   }
   facts.push({entityName:name,entityKind:'department',measureId:'headcount',value:valueCell.value,year,source:{sheet:sheet.name,cell:valueCell.address}});
  }
  if(!facts.length)issues.push({code:'NO_FACTS',severity:'error',message:'Inga uppgifter om antal anställda hittades.'});
  const mapping:TableMapping={sheet:sheet.name,headerRow:1,entityColumn:'A',yearColumn:'',valueColumn:'B',entityKind:'department',measureId:'headcount'};
  return {profile:'staff-snapshot',mapping,facts,issues,sheets:wb.worksheets.map(s=>s.name)};
 }
};
function sheetYear(name:string):number|null{
 const years=[...name.matchAll(/(?:^|\s)(20\d{2})(?=$|\s)/g)].map(m=>Number(m[1]));
 if(years.length!==1||years[0]<2020||years[0]>2100)return null;
 return years[0];
}
function eligible(sheet:ExcelJS.Worksheet):boolean{
 if(sheetYear(sheet.name)===null)return false;
 const first=sheet.getCell('A1').value,second=sheet.getCell('B1').value;
 return typeof first==='string'&&first.trim().toLocaleLowerCase('sv-SE')==='avdelning'
   &&typeof second==='string'&&second.trim().toLocaleLowerCase('sv-SE')==='antal anställda'
   &&sheet.getCell('C1').value==null;
}
