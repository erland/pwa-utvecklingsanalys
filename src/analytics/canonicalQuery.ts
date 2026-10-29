import {groupForUo,type UoGroupModel} from './groupModels';
import {prepareAnalysisDataset} from '../domain/preparedAnalysis';
import {validateCanonical,type Activity,type AnalysisRecord,type CanonicalDataset,type Metric,type ReportingAxis} from '../domain/canonical';
import type {GapState} from '../gaps/store';

export type CanonicalAnalysisQuery={axis:ReportingAxis;metrics:Metric[];activity:Activity|'all';year?:number;datasetIds?:string[];uoIds?:string[];loIds?:string[];groupModel?:UoGroupModel;groupBy?:'organization'|'source'|'year';detailUoId?:string;detailPartId?:string;organizationLevel?:'uo'|'part'};
export type CanonicalAnalysisResult={total:number;unit:'h'|'SEK';rows:{key:string;label:string;value:number}[];rowCounts:Record<string,number>;includedRecords:number;unknownCount:number;staleApprovals:number;excludedAlternatives:number;coverage:string};
const sourceId=(r:AnalysisRecord)=>r.source?.datasetId??r.workloadId.split('|')[0]??'';
const identity=(r:AnalysisRecord)=>JSON.stringify([sourceId(r),r.scope.axis==='work'?r.scope.uoId:r.scope.departmentId,r.metric,r.year,r.month??null]);
const isMatrix=(r:AnalysisRecord)=>r.scope.axis==='work'&&!r.scope.loId&&r.granularity==='activity-part'&&(r.workPart==='uo-activity-matrix'||r.authority==='original');
const approved=(r:AnalysisRecord)=>r.authority==='original'&&r.approval==='reported'||r.authority!=='original'&&r.approval==='approved';

export function analyzeCanonical(data:CanonicalDataset,state:GapState,query:CanonicalAnalysisQuery):CanonicalAnalysisResult{
 const errors=validateCanonical(data);if(errors.length)throw new Error(errors.join(','));
 if(!query.metrics.length||query.metrics.some(m=>!['it_hours','business_hours','consultant_cost','other_cost'].includes(m)))throw new Error('INVALID_METRICS');
 const hours=query.metrics.every(m=>m.endsWith('_hours')),costs=query.metrics.every(m=>m.endsWith('_cost'));
 if(!hours&&!costs)throw new Error('MIXED_UNITS');
 if(query.detailPartId&&!query.detailUoId)throw new Error('INVALID_DETAIL_PART_QUERY');
 if(query.detailUoId&&(query.axis!=='work'||query.groupModel||query.groupBy&&query.groupBy!=='organization'))throw new Error('INVALID_UO_DETAIL_QUERY');
 // The import/completion boundary produces a ready-to-query dataset.
 // The legacy overload remains for older callers and tests during migration.
 const alreadyPrepared=(data as CanonicalDataset & {preparedAnalysis?:{staleApprovals:number;excludedMatrix:number}}).preparedAnalysis;
 const prepared=alreadyPrepared?null:prepareAnalysisDataset(data,state);
 const staleApprovals=alreadyPrepared?.staleApprovals??prepared!.staleApprovals;
 const queryRecords=alreadyPrepared?data.records:prepared!.dataset.records;
 // The UO matrix is a ratio source only, never an analytic volume or detail row.
 const eligible=queryRecords.filter(r=>r.scope.axis===query.axis&&query.metrics.includes(r.metric)&&(query.year===undefined||r.year===query.year)&&(!query.datasetIds?.length||query.datasetIds.includes(sourceId(r)))&&approved(r)&&(query.axis!=='work'||r.scope.axis!=='work'||(!query.uoIds?.length||query.uoIds.includes(r.scope.uoId))&&(!query.detailUoId||r.scope.uoId===query.detailUoId)&&(!query.loIds?.length?true:Boolean(r.scope.loId&&query.loIds.includes(r.scope.loId)))));
 const excludedMatrix=alreadyPrepared?alreadyPrepared.excludedMatrix:data.records.filter(r=>isMatrix(r)&&r.scope.axis===query.axis&&query.metrics.includes(r.metric)&&(query.year===undefined||r.year===query.year)&&(!query.datasetIds?.length||query.datasetIds.includes(sourceId(r)))&&(!query.uoIds?.length||r.scope.axis!=='work'||query.uoIds.includes(r.scope.uoId))&&(!query.detailUoId||r.scope.axis==='work'&&r.scope.uoId===query.detailUoId)&&!query.loIds?.length).length;
 const filtered=eligible.filter(r=>!isMatrix(r)&&(!query.detailPartId||(r.scope.axis==='work'&&(r.scope.loId===query.detailPartId||!r.scope.loId&&r.workPart==='uo-overhead'&&query.detailPartId==='uo-overhead:'+r.scope.uoId))));
 // Separate alternative UO-level activity summary from LO detail, never sum both.
 const withLo=new Set(filtered.filter(r=>r.scope.axis==='work'&&r.scope.loId&&r.granularity==='total').map(identity));
 // In UO-detail mode overhead is additive alongside LO, but UO's activity matrix is an alternative summary.
 const withDetail=new Set(filtered.filter(r=>r.scope.axis==='work'&&r.granularity==='total'&&(r.scope.loId||r.workPart==='uo-overhead')).map(identity));
 const groups=new Map<string,AnalysisRecord[]>();
 for(const r of filtered){
  const key=JSON.stringify([r.workloadId,r.metric,r.year,r.month??null,r.scope]);
  groups.set(key,[...(groups.get(key)??[]),r]);
 }
 const results=new Map<string,{label:string;value:number}>();
 const rowCounts:Record<string,number>={};let includedRecords=0;
 let unknownCount=0,excludedAlternatives=excludedMatrix;
 for(const values of groups.values()){
  const parts=values.filter(r=>r.granularity==='activity-part');
  const total=values.find(r=>r.granularity==='total');
  const representative=total??parts[0];
  if(!representative)continue;
  const root=representative.scope.axis==='work'&&!representative.scope.loId;
  if(root&&(query.detailUoId?withDetail:withLo).has(identity(representative))&&!total&&values.every(r=>r.workPart===undefined||r.workPart==='uo-activity-matrix')){excludedAlternatives+=values.length;continue}
  // For monthly/annual collisions reject the entire selection instead of silently adding both.
  const periodPeers=filtered.filter(r=>r.metric===representative.metric&&r.year===representative.year&&sourceId(r)===sourceId(representative)&&JSON.stringify(r.scope)===JSON.stringify(representative.scope));
  if(periodPeers.some(r=>r.month!==undefined)&&periodPeers.some(r=>r.month===undefined))throw new Error('MIXED_PERIOD_GRANULARITY');
  const development=parts.find(r=>r.activity==='development');
  const maintenance=parts.find(r=>r.activity==='maintenance');
  const complete=Boolean(development&&maintenance);
  let value:number|undefined;
  if(query.activity==='all')value=total?.value??(complete?development!.value+maintenance!.value:undefined);
  else if(query.activity==='unknown')value=total&&!complete?total.value:undefined;
  else value=complete?parts.find(r=>r.activity===query.activity)?.value:undefined;
  if(query.activity!=='all'&&!complete&&(total||parts.length))unknownCount++;
  else if(query.activity==='all'&&total&&!complete)unknownCount++;
  if(value===undefined)continue;
  const contributing=total&&query.activity==='all'||total&&query.activity==='unknown'&&!complete?1:query.activity==='all'&&complete?parts.filter(r=>r.activity==='development'||r.activity==='maintenance').length:parts.filter(r=>r.activity===query.activity).length;
  const scope=representative.scope;
  const membership=scope.axis==='work'&&query.groupModel?groupForUo(query.groupModel,scope.uoId):undefined;
  const detailOverhead=Boolean(query.detailUoId&&scope.axis==='work'&&!scope.loId&&representative.workPart==='uo-overhead');
  const key=query.detailUoId&&scope.axis==='work'?(detailOverhead?'uo-overhead:'+scope.uoId:scope.loId??scope.uoId):query.groupBy==='year'?String(representative.year):query.groupBy==='source'?sourceId(representative):scope.axis==='work'&&query.groupModel?(membership?.id??'unassigned'):(scope.axis==='work'?(query.organizationLevel==='uo'?scope.uoId:scope.loId??scope.uoId):scope.departmentId);
  const label=detailOverhead?'UO Övergripande':query.groupBy==='source'||query.groupBy==='year'?key:scope.axis==='work'&&query.groupModel?(membership?.name??'Ej grupperad'):decodeURIComponent(key.split(':').at(-1)??key);
  const current=results.get(key);
  results.set(key,{label,value:(current?.value??0)+value});
  rowCounts[key]=(rowCounts[key]??0)+contributing;includedRecords+=contributing;
 }
 const rows=[...results.entries()].map(([key,r])=>({key,...r})).sort((a,b)=>{
  if(query.detailUoId){const aOver=a.key.startsWith('uo-overhead:'),bOver=b.key.startsWith('uo-overhead:');if(aOver!==bOver)return aOver?1:-1}
  return a.label.localeCompare(b.label,'sv');
 });
 return {total:rows.reduce((n,r)=>n+r.value,0),rows,rowCounts,includedRecords,unit:hours?'h':'SEK',unknownCount,staleApprovals,excludedAlternatives,
 coverage:unknownCount?'Aktivitetsfördelningen är ofullständig för '+unknownCount+' underlag. Saknade timmar räknas inte som noll.':'Alla valda underlag har tillräcklig aktivitetstäckning.'};
}
