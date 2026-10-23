import ExcelJS from 'exceljs';
import type {TableResult,TableFact,TableIssue,TableMapping} from '../tabular';

/** Two-column processtimmar: only a year stated explicitly in the worksheet name is accepted. */
export const processHoursTwoColumnFormat={
 kind:'table' as const,
 id:'process-hours-sheet-year',
 label:'Process och Timmar (år i bladnamn)',
 matches(workbook:ExcelJS.Workbook):boolean{return workbook.worksheets.some(sheet=>eligible(sheet));},
 async parse(bytes:ArrayBuffer):Promise<TableResult>{
  const wb=new ExcelJS.Workbook();await wb.xlsx.load(bytes);
  const candidates=wb.worksheets.filter(eligible);
  if(candidates.length!==1)throw new Error('Förväntade exakt ett blad med Process och Timmar samt ett år i bladnamnet.');
  const sheet=candidates[0],year=sheetYear(sheet.name)!;
  const facts:TableFact[]=[],issues:TableIssue[]=[];
  for(let r=2;r<=sheet.rowCount;r++){
   const nameCell=sheet.getCell(r,1),valueCell=sheet.getCell(r,2);
   const name=typeof nameCell.value==='string'?nameCell.value.trim():'';
   if(!name&&!valueCell.value)continue;
   if(!name){issues.push({code:'MISSING_ENTITY',severity:'error',row:r,message:'Processnamn saknas.'});continue;}
   if(valueCell.type===ExcelJS.ValueType.Formula){issues.push({code:'FORMULA_SKIPPED',severity:'error',row:r,message:'Formelvärde kan inte importeras automatiskt.'});continue;}
   if(typeof valueCell.value!=='number'||!Number.isFinite(valueCell.value)){
    issues.push({code:'INVALID_VALUE',severity:'error',row:r,message:'Timmar måste vara ett numeriskt värde.'});continue;
   }
   facts.push({entityName:name,entityKind:'process',measureId:'business_hours',value:valueCell.value,year,source:{sheet:sheet.name,cell:valueCell.address}});
  }
  if(!facts.length)issues.push({code:'NO_FACTS',severity:'error',message:'Inga processtimmar hittades.'});
  const mapping:TableMapping={sheet:sheet.name,headerRow:1,entityColumn:'A',yearColumn:'',valueColumn:'B',entityKind:'process',measureId:'business_hours'};
  return {profile:'process-hours',mapping,facts,issues,sheets:wb.worksheets.map(s=>s.name)};
 }
};
function sheetYear(name:string):number|null{
 const match=/(?:^|\s)(20\d{2})(?:$|\s)/.exec(name.trim());
 if(!match)return null;
 const year=Number(match[1]);
 return year>=2020&&year<=2100?year:null;
}
function eligible(sheet:ExcelJS.Worksheet):boolean{
 if(sheetYear(sheet.name)===null)return false;
 const h1=sheet.getCell('A1').value,h2=sheet.getCell('B1').value;
 return typeof h1==='string'&&h1.trim().toLocaleLowerCase('sv-SE')==='process'
   &&typeof h2==='string'&&h2.trim().toLocaleLowerCase('sv-SE')==='timmar'
   &&sheet.getCell('C1').value==null;
}
