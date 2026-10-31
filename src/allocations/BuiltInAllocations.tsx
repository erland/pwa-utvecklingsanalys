import {useState} from 'react';
import {approvedActivityParts} from '../domain/activityAllocation';
import type {GapState} from '../gaps/store';
import type {AnalysisRecord,CanonicalDataset,Metric} from '../domain/canonical';
import {PeriodButtons} from './WeightedUoEditor';

type Kind='activity'|'metric';
type Values={first:number;second:number};
type Row={key:string;title:string;values:Values;status:string};
const name=(id:string)=>{try{return decodeURIComponent(id.split(':').at(-1)??id)}catch{return id}};
const format=(value:number)=>value.toLocaleString('sv-SE',{maximumFractionDigits:1});
const approved=(r:AnalysisRecord)=>r.authority==='original'&&r.approval==='reported';
const annual=(records:AnalysisRecord[],metric:Metric,year:number)=>{
 const all=records.filter(r=>approved(r)&&r.metric===metric&&r.granularity==='total'&&(year===0||r.year===year));
 const groups=new Map<string,AnalysisRecord[]>();
 for(const r of all){const scope=r.scope.axis==='work'?[r.scope.uoId,r.scope.loId??'overhead']:['department',r.scope.departmentId];const key=JSON.stringify([r.source?.datasetId,scope,r.year]);groups.set(key,[...(groups.get(key)??[]),r])}
 return [...groups.values()].flatMap(group=>{const yearly=group.filter(r=>r.month===undefined);return yearly.length?yearly:group});
};
export function builtInRows(data:CanonicalDataset,kind:Kind,year:number):Row[]{
 const work=data.records.filter(r=>r.scope.axis==='work');
 const byUo=new Map<string,{first:number;second:number;hasData:boolean}>();
 if(kind==='metric'){
  for(const metric of ['it_hours','business_hours'] as const)for(const r of annual(work,metric,year)){
   if(r.scope.axis!=='work')continue;
   const entry=byUo.get(r.scope.uoId)??{first:0,second:0,hasData:false};
   entry[metric==='it_hours'?'first':'second']+=r.value;entry.hasData=true;byUo.set(r.scope.uoId,entry);
  }
 }else{
  const matrix=work.filter(r=>approved(r)&&r.granularity==='activity-part'&&r.workPart==='uo-activity-matrix'&&r.month===undefined&&(year===0||r.year===year));
  // Only report complete imported UO matrices. A partial matrix is not zero.
  const groups=new Map<string,AnalysisRecord[]>();
  for(const r of matrix){const key=JSON.stringify([r.source?.datasetId,r.scope.axis==='work'?r.scope.uoId:'',r.metric,r.year]);groups.set(key,[...(groups.get(key)??[]),r])}
  for(const group of groups.values()){
   if(!group.some(r=>r.activity==='development')||!group.some(r=>r.activity==='maintenance'))continue;
   const uoId=group[0].scope.axis==='work'?group[0].scope.uoId:'';
   const entry=byUo.get(uoId)??{first:0,second:0,hasData:false};
   entry.first+=group.find(r=>r.activity==='development')!.value;
   entry.second+=group.find(r=>r.activity==='maintenance')!.value;
   entry.hasData=true;byUo.set(uoId,entry);
  }
 }
 return [...byUo].filter(([,v])=>v.hasData).sort(([a],[b])=>name(a).localeCompare(name(b),'sv')).map(([key,v])=>({key,title:name(key),values:{first:v.first,second:v.second},status:'Importerad · låst'}));
}
export type ApprovedLoRow={key:string;uoId:string;loId:string;year:number;metric:Metric;development:number;maintenance:number;source:string};
/** Only validated approvals can produce these derived LO values; stale decisions remain invisible. */
export function approvedLoRows(data:CanonicalDataset,gaps:GapState,year:number):ApprovedLoRow[]{
 const rows:ApprovedLoRow[]=[];
 for(const rule of gaps.activityAllocationRules??[]){
  if(year!==0&&rule.year!==year)continue;
  const decision=(gaps.activityAllocationDecisions??[]).find(d=>d.ruleId===rule.id);
  if(!decision)continue;
  const parts=approvedActivityParts(data,rule,decision);
  const grouped=new Map<string,{development:number;maintenance:number}>();
  for(const part of parts){
   if(part.scope.axis!=='work'||(part.activity!=='development'&&part.activity!=='maintenance'))continue;
   const loId=part.scope.loId??'uo-overhead:'+part.scope.uoId;
   const entry=grouped.get(loId)??{development:0,maintenance:0};
   entry[part.activity==='development'?'development':'maintenance']+=part.value;
   grouped.set(loId,entry);
  }
  for(const [loId,entry] of grouped)rows.push({key:JSON.stringify([rule.datasetId,rule.uoId,loId,rule.metric,rule.year]),uoId:rule.uoId,loId,year:rule.year,metric:rule.metric,...entry,source:rule.datasetId});
 }
 return rows.sort((a,b)=>a.year-b.year||name(a.uoId).localeCompare(name(b.uoId),'sv')||name(a.loId).localeCompare(name(b.loId),'sv')||a.metric.localeCompare(b.metric));
}
export default function BuiltInAllocations({data,years,gaps}:{data:CanonicalDataset;years:number[];gaps:GapState}){
 const [selected,setSelected]=useState<Kind|null>(null);
 const [year,setYear]=useState(0);
 const approvedRows=approvedLoRows(data,gaps,year);
 const kinds:[Kind,string,string,string][]=[
  ['activity','Utveckling / Förvaltning','Utveckling','Förvaltning'],
  ['metric','IT-timmar / Verksamhetstimmar','IT-timmar','Verksamhetstimmar']
 ];
 return <section aria-label="Inbyggda fördelningstyper">
  {kinds.map(([kind,title,first,second])=>{
   const rows=builtInRows(data,kind,year);
   const totals=rows.reduce((v,r)=>({first:v.first+r.values.first,second:v.second+r.values.second}),{first:0,second:0});
   const total=totals.first+totals.second;
   return <div key={kind} className="panel" style={{width:'100%',minWidth:0}}>
    <button type="button" className="secondary" style={{display:'block',width:'100%',textAlign:'left'}} aria-expanded={selected===kind} onClick={()=>setSelected(v=>v===kind?null:kind)}><strong>{title} ›</strong></button>
    <PeriodButtons years={years} selected={year} onSelect={setYear} label={'Period '+title}/>
    <p>{total>0?`${first}: ${format(totals.first)} h · ${second}: ${format(totals.second)} h`:'Inga fullständiga importerade uppgifter för perioden.'}</p>
    <p><small>Importerade originalvärden · endast visning</small></p>
    {selected===kind&&<section aria-label={'Detaljer '+title}>
      <h4>{title} per UO</h4>
      {kind==='activity'&&<p>Här visas enbart fullständiga importerade UO-matriser. Godkända LO-kompletteringar visas separat nedan när giltiga beslut finns.</p>}
      {kind==='activity'&&approvedRows.length>0&&<section aria-label="Godkända LO-kompletteringar"><h4>Godkända LO-kompletteringar</h4><p>Härledda värden från godkända beslut. Ändringar görs tills vidare i importflödet.</p><div style={{overflowX:'auto'}}><table className="analysis-table"><thead><tr><th>UO</th><th>LO</th><th>År</th><th>Mått</th><th>Utveckling (h)</th><th>Förvaltning (h)</th><th>Källa</th></tr></thead><tbody>{approvedRows.map(r=><tr key={r.key}><td>{name(r.uoId)}</td><td>{r.loId.startsWith('uo-overhead:')?'UO Övergripande':name(r.loId)}</td><td>{r.year}</td><td>{r.metric==='it_hours'?'IT':'Verksamhet'}</td><td>{format(r.development)}</td><td>{format(r.maintenance)}</td><td>{r.source}</td></tr>)}</tbody></table></div></section>}
      {rows.length===0?<p>Inga importerade UO-matriser att visa.</p>:<div style={{overflowX:'auto'}}><table className="analysis-table"><thead><tr><th>UO</th><th>{first} (h)</th><th>{second} (h)</th><th>Ursprung</th></tr></thead><tbody>{rows.map(r=><tr key={r.key}><td>{r.title}</td><td>{format(r.values.first)}</td><td>{format(r.values.second)}</td><td>{r.status}</td></tr>)}</tbody></table></div>}
    </section>}
   </div>;
  })}
 </section>;
}
