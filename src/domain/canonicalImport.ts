import {emptyCanonical,validateCanonical,type AnalysisRecord,type CanonicalDataset,type Metric} from './canonical';
import type {ImportResult} from '../import/uoBudget';
/** Build an isolated v2 representation. Source v1 is never modified.
 * Workload identities deliberately include dataset and reporting scope: alternative sources
 * cannot be silently merged, and department distributions are distinct from LO totals.
 */
const slug=(s:string)=>encodeURIComponent(s.trim().normalize('NFKC'));
type DepartmentFact={department:string;measure:Metric;value:number;period:{year:number;month?:number};source:{sheet:string;cell:string}};
export function canonicalFromBudget(result:ImportResult,datasetId:string,includeMatrix=false,departments:DepartmentFact[]=[]):AnalysisRecord[]{
 if(result.issues.some(x=>x.severity==='error')||!result.uo.trim())throw new Error('IMPORT_NOT_APPROVED');
 const records:AnalysisRecord[]=[];
 const add=(r:AnalysisRecord)=>records.push(r);
 const from=(sheet:string,cell:string)=>({datasetId,sheet,cell});
 for(const fact of result.facts){
  if(fact.value<0)throw new Error('NEGATIVE_SOURCE_AMOUNT');
  const work={axis:'work' as const,uoId:'uo:'+slug(result.uo),loId:fact.area.match(/^UO Övergripande$/i)?undefined:'lo:'+slug(result.uo)+':'+slug(fact.area)};
  const group=[datasetId,work.uoId,work.loId??'overhead',fact.measure,fact.period.year,fact.period.month??'year'].join('|');
  add({id:[datasetId,fact.source.sheet,fact.source.cell,fact.measure].map(slug).join('|'),metric:fact.measure,value:fact.value,year:fact.period.year,...(fact.period.month?{month:fact.period.month}:{}),activity:'unknown',scope:work,authority:'original',approval:'reported',workloadId:group,granularity:'total',workPart:work.loId?'lo':'uo-overhead',source:from(fact.source.sheet,fact.source.cell)});
 }
 if(includeMatrix&&result.matrix){
  if(result.matrix.issues.length)throw new Error('MATRIX_HAS_UNREVIEWED_ISSUES');
  for(const fact of result.matrix.facts){
   if(fact.activity!=='development'&&fact.activity!=='maintenance')throw new Error('INVALID_MATRIX_ACTIVITY');
   add({id:[datasetId,fact.source.sheet,fact.source.cell,fact.measureId].map(slug).join('|'),metric:fact.measureId as Metric,value:fact.value,year:fact.year,activity:fact.activity,scope:{axis:'work',uoId:'uo:'+slug(result.uo)},authority:'original',approval:'reported',workloadId:[datasetId,'uo:'+slug(result.uo),fact.measureId,fact.year].join('|'),granularity:'activity-part',workPart:'uo-activity-matrix',source:from(fact.source.sheet,fact.source.cell)});
  }
 }
 for(const fact of departments){
  if(!fact.department.trim()||fact.value<0)throw new Error('INVALID_DEPARTMENT_FACT');
  add({id:[datasetId,fact.source.sheet,fact.source.cell,fact.measure].map(slug).join('|'),metric:fact.measure,value:fact.value,year:fact.period.year,...(fact.period.month?{month:fact.period.month}:{}),activity:'unknown',scope:{axis:'department',departmentId:'department:'+slug(fact.department)},authority:'original',approval:'reported',workloadId:[datasetId,'department',slug(fact.department),fact.measure,fact.period.year,fact.period.month??'year'].join('|'),granularity:'total',source:from(fact.source.sheet,fact.source.cell)});
 }
 const errors=validateCanonical({schemaVersion:2,records});if(errors.length)throw new Error(errors.join(', '));
 return records;
}
export function replaceCanonicalSource(existing:CanonicalDataset,records:AnalysisRecord[],datasetId:string):CanonicalDataset{
 const next={...emptyCanonical(),records:[...existing.records.filter(r=>r.source?.datasetId!==datasetId),...records]};
 const errors=validateCanonical(next);if(errors.length)throw new Error(errors.join(', '));return next;
}
