import ExcelJS from 'exceljs';
export const LO_ACTIVITY_SHEET='LO Aktiviteter 2027-2030';
export type LoActivityFact={area:string;year:number;metric:'it_hours'|'business_hours';development:number;maintenance:number;source:{sheet:string;developmentCell:string;maintenanceCell:string}};
export type LoActivityIssue={cell:string;message:string};
export type LoActivitySheetResult={facts:LoActivityFact[];issues:LoActivityIssue[]};
/** Opt-in extra sheet; no heuristics against pre-existing budget cells. */
export function readLoActivitySheet(workbook:ExcelJS.Workbook):LoActivitySheetResult{
 const sheet=workbook.getWorksheet(LO_ACTIVITY_SHEET);
 if(!sheet)return {facts:[],issues:[]};
 const facts:LoActivityFact[]=[],issues:LoActivityIssue[]=[];
 const headers=['LO','År','Mått','Utveckling (h)','Förvaltning (h)'];
 for(let col=1;col<=headers.length;col++){
  if(sheet.getCell(1,col).value!==headers[col-1])issues.push({cell:sheet.getCell(1,col).address,message:'Fel kolumnrubrik, förväntade '+headers[col-1]});
 }
 if(issues.length)return {facts,issues};
 const seen=new Set<string>();
 for(let row=2;row<=sheet.rowCount;row++){
  const cells=[1,2,3,4,5].map(col=>sheet.getCell(row,col));
  if(cells.every(cell=>cell.value===null))continue;
  const area=cells[0].value,year=cells[1].value,metric=cells[2].value;
  const development=cells[3].value,maintenance=cells[4].value;
  const issue=(col:number,message:string)=>issues.push({cell:cells[col].address,message});
  if(typeof area!=='string'||!/^LO(?:\s+)?[^\s]+(?:\s.*)?$/i.test(area.trim()))issue(0,'Ogiltigt LO-namn');
  if(typeof year!=='number'||!Number.isInteger(year)||year<2027||year>2030)issue(1,'År måste vara 2027–2030');
  if(metric!=='it_hours'&&metric!=='business_hours')issue(2,'Mått måste vara it_hours eller business_hours');
  if(typeof development!=='number'||!Number.isFinite(development)||development<0)issue(3,'Utveckling måste vara ett icke-negativt tal');
  if(typeof maintenance!=='number'||!Number.isFinite(maintenance)||maintenance<0)issue(4,'Förvaltning måste vara ett icke-negativt tal');
  if(issues.some(i=>cells.some(c=>c.address===i.cell)))continue;
  const key=JSON.stringify([area.trim(),year,metric]);
  if(seen.has(key)){issue(0,'Dubblett för LO/år/mått');continue}
  seen.add(key);
  facts.push({area:area.trim(),year:year as number,metric:metric as LoActivityFact['metric'],development:development as number,maintenance:maintenance as number,source:{sheet:sheet.name,developmentCell:cells[3].address,maintenanceCell:cells[4].address}});
 }
 return {facts,issues};
}
