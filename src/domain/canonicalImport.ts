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
 // Normalize budget detail to one annual observation per UO/LO, measure and year.
 // For 2027 monthly cells are authoritative; 2028–2030 use annual cells.
 // Never persist monthly and annual observations for the same budget key.
 const grouped=new Map<string,typeof result.facts>();
 for(const fact of result.facts){
  const key=JSON.stringify([fact.area,fact.measure,fact.period.year]);
  grouped.set(key,[...(grouped.get(key)??[]),fact]);
 }
 const annualFacts:typeof result.facts=[];
 for(const entries of grouped.values()){
  const monthly=entries.filter(f=>f.period.month!==undefined);
  const annual=entries.filter(f=>f.period.month===undefined);
  const chosen=entries[0].period.year===2027&&monthly.length?monthly:annual.length?annual:monthly;
  if(!chosen.length)continue;
  if(chosen.length===1&&chosen[0].period.month===undefined){annualFacts.push(chosen[0]);continue}
  const sum=chosen.reduce((n,f)=>n+f.value,0);
  const source=chosen[0].source;
  annualFacts.push({...chosen[0],period:{year:chosen[0].period.year},value:sum,source});
 }
 for(const fact of annualFacts){
  if(fact.value<0)throw new Error('NEGATIVE_SOURCE_AMOUNT');
  const work={axis:'work' as const,uoId:'uo:'+slug(result.uo),loId:fact.area.match(/^UO Övergripande$/i)?undefined:'lo:'+slug(result.uo)+':'+slug(fact.area)};
  const group=[datasetId,work.uoId,work.loId??'overhead',fact.measure,fact.period.year,fact.period.month??'year'].join('|');
  add({id:[datasetId,fact.source.sheet,fact.source.cell,fact.measure].map(slug).join('|'),metric:fact.measure,value:fact.value,year:fact.period.year,...(fact.period.month?{month:fact.period.month}:{}),activity:'unknown',scope:work,authority:'original',approval:'reported',workloadId:group,granularity:'total',workPart:work.loId?'lo':'uo-overhead',source:from(fact.source.sheet,fact.source.cell)});
 }
 // Optional LO activity sheet: complete original annual pairs replace no total;
 // they describe the same workload as its imported LO total.
 for(const fact of result.loActivities??[]){
  const loId='lo:'+slug(result.uo)+':'+slug(fact.area);
  const totals=records.filter(r=>r.scope.axis==='work'&&r.scope.loId===loId&&r.metric===fact.metric&&r.year===fact.year&&r.granularity==='total');
  if(totals.length!==1)throw new Error('LO_ACTIVITY_TOTAL_MISSING');
  const total=totals[0];
  if(Math.abs(total.value-fact.development-fact.maintenance)>Math.max(1e-8,total.value*1e-10))throw new Error('LO_ACTIVITY_TOTAL_MISMATCH');
  for(const activity of ['development','maintenance'] as const){
   const cell=activity==='development'?fact.source.developmentCell:fact.source.maintenanceCell;
   add({id:[datasetId,fact.source.sheet,cell,fact.metric].map(slug).join('|'),metric:fact.metric,
    value:activity==='development'?fact.development:fact.maintenance,year:fact.year,
    activity,scope:{axis:'work',uoId:'uo:'+slug(result.uo),loId},authority:'original',
    approval:'reported',workloadId:total.workloadId,granularity:'activity-part',workPart:'lo',
    source:from(fact.source.sheet,cell)});
  }
 }
 if(includeMatrix&&result.matrix){
  // A partial matrix is permitted: only validated complete pairs are in facts.
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

/** Independent project budgets are additive to UO budgets, never mapped to a fictitious UO. */
export function canonicalFromProject(result:ImportResult,datasetId:string):AnalysisRecord[]{
 if(result.profile!=='project-budget-2027-v1'||!result.uo.trim()||result.issues.some(x=>x.severity==='error'))
  throw new Error('PROJECT_IMPORT_NOT_APPROVED');
 const projectId='project:'+slug(result.uo);
 // Only a complete, positive project summary pair can define a default.
 // The summary is a ratio source, never an additive planning volume.
 const summary=new Map<string,{development?:number;maintenance?:number}>();
 for(const part of result.matrix?.facts??[]){
  if(part.activity!=='development'&&part.activity!=='maintenance')continue;
  const key=JSON.stringify([part.measureId,part.year]);
  const group=summary.get(key)??{};
  group[part.activity]=part.value;
  summary.set(key,group);
 }
 const defaults=new Map<string,number>();
 for(const [key,pair] of summary){
  if(pair.development===undefined||pair.maintenance===undefined)continue;
  const total=pair.development+pair.maintenance;
  if(total>0)defaults.set(key,100*pair.development/total);
 }
 const grouped=new Map<string,typeof result.facts>();
 for(const fact of result.facts){
  if(fact.value<0||!Number.isFinite(fact.value))throw new Error('NEGATIVE_SOURCE_AMOUNT');
  const key=JSON.stringify([fact.area,fact.measure,fact.period.year]);
  grouped.set(key,[...(grouped.get(key)??[]),fact]);
 }
 const records:AnalysisRecord[]=[];
 for(const facts of grouped.values()){
  const annual=facts.filter(f=>f.period.month===undefined);
  const monthly=facts.filter(f=>f.period.month!==undefined);
  const chosen=facts[0].period.year===2027&&monthly.length?monthly:annual.length?annual:monthly;
  const first=chosen[0];if(!first)continue;
  const partId='project-part:'+slug(result.uo)+':'+slug(first.area);
  const value=chosen.reduce((sum,f)=>sum+f.value,0);
  records.push({
   id:[datasetId,first.source.sheet,first.source.cell,first.measure,'project'].map(slug).join('|'),
   metric:first.measure,value,year:first.period.year,activity:'unknown',
   ...(defaults.has(JSON.stringify([first.measure,first.period.year]))?
    {projectDefaultDevelopmentPercent:defaults.get(JSON.stringify([first.measure,first.period.year]))}:
    first.measure==='consultant_cost'&&defaults.has(JSON.stringify(['other_cost',first.period.year]))?
    {projectDefaultDevelopmentPercent:defaults.get(JSON.stringify(['other_cost',first.period.year]))}:{}),
   scope:{axis:'project',projectId,partId},authority:'original',approval:'reported',
   granularity:'total',workloadId:[datasetId,projectId,partId,first.measure,first.period.year].join('|'),
   source:{datasetId,sheet:first.source.sheet,cell:first.source.cell}
  });
 }
 const errors=validateCanonical({...emptyCanonical(),records});
 if(errors.length)throw new Error(errors.join(','));
 return records;
}
