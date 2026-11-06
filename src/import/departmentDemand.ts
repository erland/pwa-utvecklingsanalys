import ExcelJS from 'exceljs';

export type DepartmentDemand = {
 uo:string;departmentCodeRaw:string;departmentCode:string;departmentName:string;
 year:number;metric:'it_hours'|'business_hours';hours:number;
 anchoringStatus:string;comments:string[];
 source:{sheet:string;cell:string};
};
export type DepartmentDemandIssue={code:string;message:string;cell?:string};
export type DepartmentDemandRowStatus={
 row:number;code:string;name:string;imported:number;skipped:number;
 status:'imported'|'partial'|'no-hours'|'invalid-code'|'invalid-hours'|'missing-code'|'missing-name';
 reason:string;
 /** Imported value is never inferred from the displayed Excel formatting. */
 codeCell:string;nameCell:string;yearCells:string;
};
export type DepartmentDemandParse={facts:DepartmentDemand[];issues:DepartmentDemandIssue[];years:number[];rows:DepartmentDemandRowStatus[]};

/** Alternative breakdown of UO demand, NEVER additive to UO/LO budget facts. */
export function readDepartmentDemand(workbook:ExcelJS.Workbook,uo:string):DepartmentDemandParse{
 const sheet=workbook.getWorksheet('Timmar per avdelning');
 if(!sheet)return {facts:[],issues:[],years:[],rows:[]};
 const years=new Map<number,number>(),issues:DepartmentDemandIssue[]=[],facts:DepartmentDemand[]=[],rows:DepartmentDemandRowStatus[]=[];
 for(let col=3;col<=sheet.columnCount;col++){
  const raw=sheet.getRow(4).getCell(col).value;
  const year=typeof raw==='number'?raw:typeof raw==='string'?Number(/^(?:Timmar\s+)?(20\d{2})$/i.exec(raw.trim())?.[1]??NaN):NaN;
  if(Number.isInteger(year)&&year>=2000&&year<=2100){
   if(years.has(year))issues.push({code:'DUPLICATE_YEAR',message:'Duplicerat år i avdelningsbladet',cell:sheet.getRow(4).getCell(col).address});
   else years.set(year,col);
  }
 }
 if(!years.size){issues.push({code:'NO_DEPARTMENT_YEARS',message:'Inga årtal på rad 4 i avdelningsbladet'});return {facts,issues,years:[],rows}}
 const describe=(cell:ExcelJS.Cell):string=>{
  const raw=cell.value;
  if(raw===null||raw===undefined||raw==='')return cell.address+': tom';
  if(cell.type===ExcelJS.ValueType.Formula)return cell.address+': formel';
  if(typeof raw==='number')return cell.address+': tal';
  if(typeof raw==='string')return cell.address+': text '+JSON.stringify(raw.slice(0,100));
  if(raw&&typeof raw==='object'&&'richText'in raw)return cell.address+': formaterad text';
  if(raw&&typeof raw==='object'&&'text'in raw)return cell.address+': objekttext';
  return cell.address+': '+(raw instanceof Date?'datum':'objekt');
 };
 const value=(row:number,col:number)=>{
  const raw=sheet.getRow(row).getCell(col).value;
  return typeof raw==='string'?raw.trim():typeof raw==='number'?String(raw):'';
 };
 // Department identity, not row position, determines whether a row is a detail.
 // Totals, blank separators and notes do not have a department code.
 for(let row=5;row<=sheet.rowCount;row++){
  const name=value(row,2),code=value(row,1);
  // Inspect all likely department rows, including those whose code/name is
  // encoded as a formula or rich text. Never treat totals as departments.
  const yearCells=[...years.values()].map(col=>describe(sheet.getRow(row).getCell(col))).join(' · ');
  const codeCell=describe(sheet.getRow(row).getCell(1));
  const nameCell=describe(sheet.getRow(row).getCell(2));
  const rowInfo={row,code,name,imported:0,skipped:0,codeCell,nameCell,yearCells};
  const hasYearEntry=[...years.values()].some(col=>{
   const raw=sheet.getRow(row).getCell(col).value;
   return raw!==null&&raw!==undefined&&raw!=='';
  });
  const cleanName=name.replace(/^[\\s·•–-]+/u,'').trim();
  if(/^(?:alla avdelningar|totalt?|summa|summering)$/i.test(cleanName))continue;
  const likelyDepartment=/avdelning|stab|revision/i.test(name)||/^\s*\d/.test(code)||
   (Boolean(name)&&hasYearEntry&&!/^(?:totalt?|summa|summering|alla avdelningar)$/i.test(name.trim()));
  if(!likelyDepartment)continue;
  if(!name){
   rows.push({...rowInfo,status:'missing-name',reason:'Namn saknas eller är inte vanlig text i B'+row});
   continue;
  }
  if(!code){
   rows.push({...rowInfo,status:'missing-code',reason:'Kod saknas eller är inte vanlig text/tal i A'+row});
   continue;
  }
  if(!/^\d{3,}\*?$/.test(code)){
   rows.push({...rowInfo,status:'invalid-code',reason:'Ogiltig avdelningskod i A'+row+' (förväntat minst tre siffror och eventuellt *)'});
   continue;
  }
  let imported=0,skipped=0;
  // The IT department belongs to IT hours regardless of its location.
  const metric=code.replaceAll('*','')==='713'||/^IT[-\s]avdelningen$/i.test(name)?'it_hours':'business_hours';
  const anchoringStatus=value(row,6);
  const comments=[7,8,9].map(col=>value(row,col)).filter(Boolean);
  for(const [year,col] of years){
   const cell=sheet.getRow(row).getCell(col),raw=cell.value;
   if(raw===null||raw===undefined||raw==='')continue;
   if(cell.type===ExcelJS.ValueType.Formula||typeof raw!=='number'||!Number.isFinite(raw)||raw<0){
    issues.push({code:'INVALID_DEPARTMENT_HOURS',message:'Timmar måste vara ett icke-negativt numeriskt detaljvärde (inte formel)',cell:cell.address});skipped++;continue;
   }
   imported++;
   facts.push({uo,departmentCodeRaw:code,departmentCode:code.replaceAll('*','').trim(),departmentName:name,year,metric,hours:raw,anchoringStatus,comments,source:{sheet:sheet.name,cell:cell.address}});
  }
  rows.push({...rowInfo,imported,skipped,status:skipped?(imported?'partial':'invalid-hours'):imported?'imported':'no-hours',reason:skipped?'Ogiltigt timvärde eller formel i en eller flera årskolumner':imported?'':'Inga numeriska timvärden i årskolumnerna'});
 }
 return {facts,issues,years:[...years.keys()].sort((a,b)=>a-b),rows};
}
