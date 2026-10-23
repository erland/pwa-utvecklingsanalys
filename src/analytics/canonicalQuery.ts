import {groupForUo,type UoGroupModel} from './groupModels';
import {approvedActivityParts} from '../domain/activityAllocation';
import {validateCanonical,type Activity,type AnalysisRecord,type CanonicalDataset,type Metric,type ReportingAxis} from '../domain/canonical';
import type {GapState} from '../gaps/store';

export type CanonicalAnalysisQuery={axis:ReportingAxis;metrics:Metric[];activity:Activity|'all';year?:number;datasetIds?:string[];uoIds?:string[];loIds?:string[];groupModel?:UoGroupModel;groupBy?:'organization'|'source'|'year'};
export type CanonicalAnalysisResult={total:number;unit:'h'|'SEK';rows:{key:string;label:string;value:number}[];rowCounts:Record<string,number>;includedRecords:number;unknownCount:number;staleApprovals:number;excludedAlternatives:number;coverage:string};
const sourceId=(r:AnalysisRecord)=>r.source?.datasetId??r.workloadId.split('|')[0]??'';
const identity=(r:AnalysisRecord)=>JSON.stringify([sourceId(r),r.scope.axis==='work'?r.scope.uoId:r.scope.departmentId,r.metric,r.year,r.month??null]);
const approved=(r:AnalysisRecord)=>r.authority==='original'&&r.approval==='reported'||r.authority!=='original'&&r.approval==='approved';

export function analyzeCanonical(data:CanonicalDataset,state:GapState,query:CanonicalAnalysisQuery):CanonicalAnalysisResult{
 const errors=validateCanonical(data);if(errors.length)throw new Error(errors.join(','));
 if(!query.metrics.length||query.metrics.some(m=>!['it_hours','business_hours','consultant_cost','other_cost'].includes(m)))throw new Error('INVALID_METRICS');
 const hours=query.metrics.every(m=>m.endsWith('_hours')),costs=query.metrics.every(m=>m.endsWith('_cost'));
 if(!hours&&!costs)throw new Error('MIXED_UNITS');
 const rules=state.activityAllocationRules??[],decisions=state.activityAllocationDecisions??[];
 const calculated:AnalysisRecord[]=[];
 let staleApprovals=0;
 for(const rule of rules){
  const decision=decisions.find(d=>d.ruleId===rule.id);
  if(!decision)continue;
  const rows=approvedActivityParts(data,rule,decision);
  if(rows.length)calculated.push(...rows);else staleApprovals++;
 }
 const filtered=[...data.records,...calculated].filter(r=>r.scope.axis===query.axis&&query.metrics.includes(r.metric)&&(query.year===undefined||r.year===query.year)&&(!query.datasetIds?.length||query.datasetIds.includes(sourceId(r)))&&approved(r)&&(query.axis!=='work'||r.scope.axis!=='work'||(!query.uoIds?.length||query.uoIds.includes(r.scope.uoId))&&(!query.loIds?.length?true:Boolean(r.scope.loId&&query.loIds.includes(r.scope.loId)))));
 // Separate alternative UO-level activity summary from LO detail, never sum both.
 const withLo=new Set(filtered.filter(r=>r.scope.axis==='work'&&r.scope.loId&&r.granularity==='total').map(identity));
 const groups=new Map<string,AnalysisRecord[]>();
 for(const r of filtered){
  const key=JSON.stringify([r.workloadId,r.metric,r.year,r.month??null,r.scope]);
  groups.set(key,[...(groups.get(key)??[]),r]);
 }
 const results=new Map<string,{label:string;value:number}>();
 const rowCounts:Record<string,number>={};let includedRecords=0;
 let unknownCount=0,excludedAlternatives=0;
 for(const values of groups.values()){
  const parts=values.filter(r=>r.granularity==='activity-part');
  const total=values.find(r=>r.granularity==='total');
  const representative=total??parts[0];
  if(!representative)continue;
  const root=representative.scope.axis==='work'&&!representative.scope.loId;
  if(root&&withLo.has(identity(representative))&&!total&&values.every(r=>r.workPart===undefined||r.workPart==='uo-activity-matrix')){excludedAlternatives+=values.length;continue}
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
  const key=query.groupBy==='year'?String(representative.year):query.groupBy==='source'?sourceId(representative):scope.axis==='work'&&query.groupModel?(membership?.id??'unassigned'):(scope.axis==='work'?(scope.loId??scope.uoId):scope.departmentId);
  const label=query.groupBy==='source'||query.groupBy==='year'?key:scope.axis==='work'&&query.groupModel?(membership?.name??'Ej grupperad'):decodeURIComponent(key.split(':').at(-1)??key);
  const current=results.get(key);
  results.set(key,{label,value:(current?.value??0)+value});
  rowCounts[key]=(rowCounts[key]??0)+contributing;includedRecords+=contributing;
 }
 const rows=[...results.entries()].map(([key,r])=>({key,...r})).sort((a,b)=>a.label.localeCompare(b.label,'sv'));
 return {total:rows.reduce((n,r)=>n+r.value,0),rows,rowCounts,includedRecords,unit:hours?'h':'SEK',unknownCount,staleApprovals,excludedAlternatives,
 coverage:unknownCount?'Aktivitetsfördelningen är ofullständig för '+unknownCount+' underlag. Saknade timmar räknas inte som noll.':'Alla valda underlag har tillräcklig aktivitetstäckning.'};
}
