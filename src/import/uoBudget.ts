import ExcelJS from 'exceljs';
export type Measure='it_hours'|'business_hours'|'other_cost'|'consultant_cost';
export type Fact={uo:string;area:string;measure:Measure;period:{year:number;month?:number};value:number;unit:'h'|'SEK';source:{sheet:string;cell:string}};
export type Issue={code:string;severity:'error'|'warning';message:string;cell?:string};
export type Mapping={sheet:string;uoCell:string;headerRow:number;areaColumn:number;labelColumn:number;startRow:number};
export const defaultMapping:Mapping={sheet:'UO Tot 2027-30',uoCell:'B1',headerRow:11,areaColumn:2,labelColumn:3,startRow:19};
export type Coverage={candidates:number;imported:number;unresolved:number;formulas:number;perArea:{name:string;count:number}[]};
export type ImportResult={profile:string;uo:string;facts:Fact[];issues:Issue[];excludedSheets:string[];coverage?:Coverage};
function valueText(cell:ExcelJS.Cell):string{const v=cell.value;if(v==null)return '';if(typeof v==='object'&&! (v instanceof Date)){if('text'in v)return String(v.text);if('result'in v)return String(v.result??'');return '';}return String(v);}
function measure(s:string):Measure|null{const v=s.toLowerCase().replace(/\s+/g,' ');if(/it[ -]?timmar/.test(v))return 'it_hours';if(/v timmar|verksamhetstimmar/.test(v))return 'business_hours';if(/prod.konsulter|produktkonsulter/.test(v))return 'consultant_cost';if(/omk/.test(v)&&/övrigt/.test(v))return 'other_cost';return null;}
function period(v:ExcelJS.Cell['value']){if(v instanceof Date)return {year:v.getFullYear(),month:v.getMonth()+1};if(typeof v==='number'&&Number.isInteger(v)&&v>=2020&&v<=2100)return {year:v};if(typeof v==='string'){const m=v.match(/^(20\d{2})(?:[-/]([01]?\d))?$/);if(m)return {year:+m[1],...(m[2]?{month:+m[2]}:{})};}return null;}
export async function importUoBudget(bytes:ArrayBuffer,mapping?:Mapping):Promise<ImportResult>{
 const wb=new ExcelJS.Workbook();await wb.xlsx.load(bytes);
 const sheet=mapping?wb.getWorksheet(mapping.sheet):wb.worksheets.find(s=>/^UO Tot 2027[-–]30$/.test(s.name));
 if(!sheet)return {profile:'uo-budget-2027-v1',uo:'',facts:[],issues:[{code:'PROFILE_NOT_MATCHED',severity:'error',message:'UO totalblad hittades inte.'}],excludedSheets:wb.worksheets.map(s=>s.name)};
 const issues:Issue[]=[];const uo=valueText(sheet.getCell(mapping?.uoCell??'B1')).replace(/^UO:\s*/i,'').replace(/^["“]|["”]$/g,'').trim();
 if(!uo||/skriv namn/i.test(uo))issues.push({code:'UO_NAME_MISSING',severity:'warning',message:'UO-namn saknas eller är en platshållare.',cell:'B1'});
 const periods=new Map<number,{year:number;month?:number}>();
 for(let c=4;c<=sheet.columnCount;c++){const header=sheet.getCell(mapping?.headerRow??11,c);const p=period(header.value);if(p)periods.set(c,p);else {const annual=valueText(header).match(/^ÅRSBEHOV\s+(20\d{2})$/i);if(annual&&Number(annual[1])>2027)periods.set(c,{year:Number(annual[1])});}}
 if(!periods.size)issues.push({code:'PERIOD_HEADERS_MISSING',severity:'error',message:'Periodrubriker saknas i rad 11.'});
 let area='';const facts:Fact[]=[];let candidates=0,unresolved=0,formulas=0;
 for(let r=mapping?.startRow??19;r<=sheet.rowCount;r++){
  const row=sheet.getRow(r),a=valueText(row.getCell(mapping?.areaColumn??2)).trim(),label=valueText(row.getCell(mapping?.labelColumn??3)).trim();
  if(a&&(/^(UO Övergripande|LO\s+\S+)/i.test(a)))area=a;
  const kind=measure(label);
  if(!label||/\bTOT\b|\bSUMMA\b/i.test(label))continue;
  for(const [c,p] of periods){
   const cell=row.getCell(c);if(cell.type===ExcelJS.ValueType.Formula)continue;
   const v=cell.value;if(v==null)continue;
   if(typeof v!=='number'||!Number.isFinite(v)){if(kind)issues.push({code:'NON_NUMERIC_INPUT',severity:'warning',message:'Icke-numeriskt detaljvärde.',cell:cell.address});continue;}
   candidates++;
   if(!area||!kind){unresolved++;issues.push({code:!area?'UNKNOWN_AREA':'UNKNOWN_MEASURE',severity:'error',message:!area?'Värde utan identifierat UO/LO.':'Okänt mått: '+label,cell:cell.address});continue;}
   facts.push({uo,area,measure:kind,period:p,value:v,unit:kind.endsWith('hours')?'h':'SEK',source:{sheet:sheet.name,cell:cell.address}});
  }
 }
 if(!facts.length)issues.push({code:'NO_DETAIL_VALUES',severity:'warning',message:'Inga ifyllda detaljvärden hittades.'});
 const counts=new Map<string,number>();for(const f of facts)counts.set(f.area,(counts.get(f.area)??0)+1);
 return {profile:'uo-budget-2027-v1',uo,facts,issues,coverage:{candidates,imported:facts.length,unresolved,formulas,perArea:[...counts].map(([name,count])=>({name,count}))},excludedSheets:wb.worksheets.filter(s=>s.id!==sheet.id).map(s=>s.name)};
}
