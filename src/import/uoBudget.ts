import ExcelJS from 'exceljs';
export type Measure='it_hours'|'business_hours'|'other_cost'|'consultant_cost';
export type Fact={uo:string;area:string;measure:Measure;period:{year:number;month?:number};value:number;unit:'h'|'SEK';source:{sheet:string;cell:string}};
export type Issue={code:string;severity:'error'|'warning';message:string;cell?:string};
export type ImportResult={profile:string;uo:string;facts:Fact[];issues:Issue[];excludedSheets:string[]};
function valueText(cell:ExcelJS.Cell):string{const v=cell.value;if(v==null)return '';if(typeof v==='object'&&! (v instanceof Date)){if('text'in v)return String(v.text);if('result'in v)return String(v.result??'');return '';}return String(v);}
function measure(s:string):Measure|null{const v=s.toLowerCase().replace(/\s+/g,' ');if(/it[ -]?timmar/.test(v))return 'it_hours';if(/v timmar|verksamhetstimmar/.test(v))return 'business_hours';if(/prod.konsulter|produktkonsulter/.test(v))return 'consultant_cost';if(/omk/.test(v)&&/övrigt/.test(v))return 'other_cost';return null;}
function period(v:ExcelJS.Cell['value']){if(v instanceof Date)return {year:v.getFullYear(),month:v.getMonth()+1};if(typeof v==='number'&&Number.isInteger(v)&&v>=2020&&v<=2100)return {year:v};if(typeof v==='string'){const m=v.match(/^(20\d{2})(?:[-/]([01]?\d))?$/);if(m)return {year:+m[1],...(m[2]?{month:+m[2]}:{})};}return null;}
export async function importUoBudget(bytes:ArrayBuffer):Promise<ImportResult>{
 const wb=new ExcelJS.Workbook();await wb.xlsx.load(bytes);
 const sheet=wb.worksheets.find(s=>/^UO Tot 2027[-–]30$/.test(s.name));
 if(!sheet)return {profile:'uo-budget-2027-v1',uo:'',facts:[],issues:[{code:'PROFILE_NOT_MATCHED',severity:'error',message:'UO totalblad hittades inte.'}],excludedSheets:wb.worksheets.map(s=>s.name)};
 const issues:Issue[]=[];const uo=valueText(sheet.getCell('B1')).replace(/^UO:\s*/i,'').replace(/^["“]|["”]$/g,'').trim();
 if(!uo||/skriv namn/i.test(uo))issues.push({code:'UO_NAME_MISSING',severity:'warning',message:'UO-namn saknas eller är en platshållare.',cell:'B1'});
 const periods=new Map<number,{year:number;month?:number}>();
 for(let c=4;c<=sheet.columnCount;c++){const p=period(sheet.getCell(11,c).value);if(p)periods.set(c,p);}
 if(!periods.size)issues.push({code:'PERIOD_HEADERS_MISSING',severity:'error',message:'Periodrubriker saknas i rad 11.'});
 let area='';const facts:Fact[]=[];
 for(let r=19;r<=sheet.rowCount;r++){
  const row=sheet.getRow(r),a=valueText(row.getCell(2)).trim(),label=valueText(row.getCell(3)).trim();
  if(/^(UO Övergripande|LO\s*\d+)/i.test(a))area=a;
  const kind=measure(label);if(!area||!kind)continue;
  for(const [c,p] of periods){
   const cell=row.getCell(c);if(cell.type===ExcelJS.ValueType.Formula)continue;
   const v=cell.value;if(v==null)continue;
   if(typeof v!=='number'||!Number.isFinite(v)){issues.push({code:'NON_NUMERIC_INPUT',severity:'warning',message:'Icke-numeriskt detaljvärde.',cell:cell.address});continue;}
   facts.push({uo,area,measure:kind,period:p,value:v,unit:kind.endsWith('hours')?'h':'SEK',source:{sheet:sheet.name,cell:cell.address}});
  }
 }
 if(!facts.length)issues.push({code:'NO_DETAIL_VALUES',severity:'warning',message:'Inga ifyllda detaljvärden hittades.'});
 return {profile:'uo-budget-2027-v1',uo,facts,issues,excludedSheets:wb.worksheets.filter(s=>s.id!==sheet.id).map(s=>s.name)};
}
