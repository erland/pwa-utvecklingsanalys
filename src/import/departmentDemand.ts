import ExcelJS from 'exceljs';

export type DepartmentDemand = {
 uo:string;departmentCodeRaw:string;departmentCode:string;departmentName:string;
 year:number;metric:'it_hours'|'business_hours';hours:number;
 anchoringStatus:string;comments:string[];
 source:{sheet:string;cell:string};
};
export type DepartmentDemandIssue={code:string;message:string;cell?:string};
export type DepartmentDemandParse={facts:DepartmentDemand[];issues:DepartmentDemandIssue[];years:number[]};

/** Alternative breakdown of UO demand, NEVER additive to UO/LO budget facts. */
export function readDepartmentDemand(workbook:ExcelJS.Workbook,uo:string):DepartmentDemandParse{
 const sheet=workbook.getWorksheet('Timmar per avdelning');
 if(!sheet)return {facts:[],issues:[],years:[]};
 const years=new Map<number,number>(),issues:DepartmentDemandIssue[]=[],facts:DepartmentDemand[]=[];
 for(let col=3;col<=sheet.columnCount;col++){
  const raw=sheet.getRow(4).getCell(col).value;
  const year=typeof raw==='number'?raw:typeof raw==='string'?Number(/^(?:Timmar\s+)?(20\d{2})$/i.exec(raw.trim())?.[1]??NaN):NaN;
  if(Number.isInteger(year)&&year>=2000&&year<=2100){
   if(years.has(year))issues.push({code:'DUPLICATE_YEAR',message:'Duplicerat år i avdelningsbladet',cell:sheet.getRow(4).getCell(col).address});
   else years.set(year,col);
  }
 }
 if(!years.size){issues.push({code:'NO_DEPARTMENT_YEARS',message:'Inga årtal på rad 4 i avdelningsbladet'});return {facts,issues,years:[]}}
 const value=(row:number,col:number)=>{
  const raw=sheet.getRow(row).getCell(col).value;
  return typeof raw==='string'?raw.trim():typeof raw==='number'?String(raw):'';
 };
 for(const row of [6,7,8,9,10,11,12,13,14,15,18]){
  const name=value(row,2),code=value(row,1);
  if(!name)continue;
  const metric=row===18?'it_hours':'business_hours';
  const anchoringStatus=value(row,6);
  const comments=[7,8,9].map(col=>value(row,col)).filter(Boolean);
  for(const [year,col] of years){
   const cell=sheet.getRow(row).getCell(col),raw=cell.value;
   if(raw===null||raw===undefined||raw==='')continue;
   if(cell.type===ExcelJS.ValueType.Formula||typeof raw!=='number'||!Number.isFinite(raw)||raw<0){
    issues.push({code:'INVALID_DEPARTMENT_HOURS',message:'Timmar måste vara ett icke-negativt numeriskt detaljvärde (inte formel)',cell:cell.address});continue;
   }
   facts.push({uo,departmentCodeRaw:code,departmentCode:code.replaceAll('*','').trim(),departmentName:name,year,metric,hours:raw,anchoringStatus,comments,source:{sheet:sheet.name,cell:cell.address}});
  }
 }
 return {facts,issues,years:[...years.keys()].sort((a,b)=>a-b)};
}
