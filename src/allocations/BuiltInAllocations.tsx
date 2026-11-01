import {useState} from 'react';
import {approvedActivityParts,previewActivityAllocation,approveBalancedActivityGroup,type ActivityAllocationRule,type AllocationPreview} from '../domain/activityAllocation';
import LoAllocationDraft from '../gaps/LoAllocationDraft';
import {loadGapState,saveGapState} from '../gaps/store';
import type {GapState} from '../gaps/store';
import type {AnalysisRecord,CanonicalDataset,Metric} from '../domain/canonical';
import {PeriodButtons} from './WeightedUoEditor';

type Kind='activity'|'metric';
type Values={first:number;second:number};
type Row={key:string;title:string;values:Values;status:string};
const name=(id:string)=>{try{return decodeURIComponent(id.split(':').at(-1)??id)}catch{return id}};
const format=(value:number)=>value.toLocaleString('sv-SE',{maximumFractionDigits:1});
function DistributionIndicator({first,second,labels}:{first:number;second:number;labels:[string,string]}){
 const total=first+second;
 const percent=total>0?100*first/total:0;
 return <div role="img" aria-label={labels[0]+': '+format(first)+' timmar, '+labels[1]+': '+format(second)+' timmar'}>
  <div style={{display:'flex',width:'100%',height:14,overflow:'hidden',borderRadius:8,background:'#e2e8f0',marginTop:12}}>
   <span style={{width:percent+'%',background:'#2563eb'}}/><span style={{width:(100-percent)+'%',background:'#0d9488'}}/>
  </div>
  <p>{labels[0]}: {format(first)} h ({format(percent)} %) · {labels[1]}: {format(second)} h ({format(total>0?100-percent:0)} %)</p>
 </div>;
}
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
export default function BuiltInAllocations({data,years,gaps,onSaved}:{data:CanonicalDataset;years:number[];gaps:GapState;onSaved:(next:GapState)=>void}){
 const [selected,setSelected]=useState<Kind|null>(null);
 const [year,setYear]=useState(0);
 const [selectedUo,setSelectedUo]=useState<string|null>(null);
 const [loYears,setLoYears]=useState<Record<string,number>>({});
 const approvedRows=approvedLoRows(data,gaps,year);
 const editorGroups=new Map<string,{rules:ActivityAllocationRule[];previews:AllocationPreview[]}>();
 for(const rule of gaps.activityAllocationRules??[]){
  const decision=(gaps.activityAllocationDecisions??[]).find(d=>d.ruleId===rule.id);
  if(!decision||approvedActivityParts(data,rule,decision).length===0)continue;
  let preview:AllocationPreview;
  try{preview=previewActivityAllocation(data,rule)}catch{continue}
  const key=JSON.stringify([rule.datasetId,rule.uoId,rule.year]);
  const group=editorGroups.get(key)??{rules:[],previews:[]};
  group.rules.push(rule);group.previews.push(preview);editorGroups.set(key,group);
 }
 const saveGroup=async(group:{rules:ActivityAllocationRule[];previews:AllocationPreview[]},overrides:{loId:string;developmentPercent:number}[],reason:string)=>{
  const approvals=approveBalancedActivityGroup(group.previews,reason,overrides);
  const latest=await loadGapState();
  // Abort if another tab has replaced source-linked decisions since the displayed snapshot.
  for(const rule of group.rules){
   const shown=(gaps.activityAllocationDecisions??[]).find(d=>d.ruleId===rule.id);
   const current=(latest.activityAllocationDecisions??[]).find(d=>d.ruleId===rule.id);
   if(JSON.stringify(shown)!==JSON.stringify(current))throw new Error('Fördelningen har ändrats. Ladda om sidan.');
  }
  const decisions=[...(latest.activityAllocationDecisions??[])];
  for(let i=0;i<group.rules.length;i++){
   const ruleId=group.rules[i].id;
   const index=decisions.findIndex(d=>d.ruleId===ruleId);
   if(index<0)throw new Error('Fördelningsbeslut saknas. Ladda om sidan.');
   decisions[index]=approvals[i];
  }
  const next={...latest,activityAllocationDecisions:decisions};
  await saveGapState(next);onSaved(next);
 };
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
    <button type="button" className="secondary" style={{display:'block',width:'100%',textAlign:'left'}} aria-expanded={selected===kind} onClick={()=>{setSelected(v=>v===kind?null:kind);setSelectedUo(null);}}><strong>{title} ›</strong></button>
    <PeriodButtons years={years} selected={year} onSelect={setYear} label={'Period '+title}/>
    <p>{total>0?`${first}: ${format(totals.first)} h · ${second}: ${format(totals.second)} h`:'Inga fullständiga importerade uppgifter för perioden.'}</p>
    <p><small>{kind==='metric'?'Importerade originalvärden · endast visning':'Importerad UO-matris · LO kan justeras om det inte är importerat'}</small></p>
    {selected===kind&&<section aria-label={'Detaljer '+title}>
      <button type="button" className="secondary" onClick={()=>{setSelected(null);setSelectedUo(null);void 0}}>← Alla fördelningstyper</button>
      <h3>{title} – Fördelning per UO och LO</h3>
      <PeriodButtons years={years} selected={year} onSelect={setYear} label={'Detaljperiod '+title}/>
      {selectedUo&&<button type="button" className="secondary" onClick={()=>{setSelectedUo(null);void 0}}>← Alla UO</button>}
      <h4>{title} per UO</h4>
      {kind==='activity'&&<p>Här visas enbart fullständiga importerade UO-matriser. Godkända LO-kompletteringar visas separat nedan när giltiga beslut finns.</p>}
      {kind==='activity'&&selectedUo&&![...editorGroups.values()].some(g=>g.rules[0].uoId===selectedUo)&&<section aria-label="Godkända LO-kompletteringar" className="panel">
       <h4>LO-fördelningar</h4><p>Godkända, kompletterade timmar. IT- och verksamhetstimmar visas sammanräknade som timmar.</p>
       {(()=>{
        const groups=new Map<string,{loId:string;year:number;development:number;maintenance:number}>();
        // Reported LO activity pairs are authoritative; approvals supply only missing LO pairs.
        const originalGroups=new Set<string>();
        const originals=data.records.filter(r=>r.scope.axis==='work'&&r.scope.uoId===selectedUo&&r.scope.loId&&r.authority==='original'&&r.approval==='reported'&&r.granularity==='activity-part'&&r.month===undefined&&(year===0||r.year===year)&&['it_hours','business_hours'].includes(r.metric));
        const originalPairs=new Map<string,typeof originals>();
        for(const r of originals){const key=JSON.stringify([r.source?.datasetId,r.scope.axis==='work'?r.scope.loId:'',r.metric,r.year]);originalPairs.set(key,[...(originalPairs.get(key)??[]),r])}
        for(const pair of originalPairs.values()){
         if(pair.length!==2||!pair.some(r=>r.activity==='development')||!pair.some(r=>r.activity==='maintenance'))continue;
         const first=pair[0];if(first.scope.axis!=='work'||!first.scope.loId)continue;
         const loId=first.scope.loId,key=JSON.stringify([loId,first.year]);
         const current=groups.get(key)??{loId,year:first.year,development:0,maintenance:0};
         current.development+=pair.find(r=>r.activity==='development')!.value;
         current.maintenance+=pair.find(r=>r.activity==='maintenance')!.value;groups.set(key,current);
         originalGroups.add(JSON.stringify([first.source?.datasetId,loId,first.metric,first.year]));
        }
        for(const r of approvedRows.filter(r=>r.uoId===selectedUo)){
         if(originalGroups.has(JSON.stringify([r.source,r.loId,r.metric,r.year])))continue;
         const key=JSON.stringify([r.loId,r.year]);
         const current=groups.get(key)??{loId:r.loId,year:r.year,development:0,maintenance:0};
         current.development+=r.development;current.maintenance+=r.maintenance;groups.set(key,current);
        }
        return [...groups.values()].sort((a,b)=>a.year-b.year||name(a.loId).localeCompare(name(b.loId),'sv')).map(r=><div key={JSON.stringify([r.loId,r.year])} className="panel" style={{marginTop:8}}>
         <strong>{r.loId.startsWith('uo-overhead:')?'UO Övergripande':name(r.loId)} · {r.year}</strong>
         <DistributionIndicator first={r.development} second={r.maintenance} labels={['Utveckling','Förvaltning']}/>
         <small>Importerade och godkända LO-värden</small>
        </div>);
       })()}
      </section>}
      {kind==='activity'&&selectedUo&&(()=>{
       // One persistent LO card across years. Each card selects the annual approval independently.
       const groupEntries=[...editorGroups].filter(([,group])=>group.rules[0].uoId===selectedUo);
       const loIds=[...new Set(groupEntries.flatMap(([,group])=>group.previews.flatMap(p=>p.items.map(i=>i.loId))))].sort((a,b)=>name(a).localeCompare(name(b),'sv'));
       return loIds.map(loId=>{
        const available=groupEntries.filter(([,group])=>group.previews.some(p=>p.items.some(i=>i.loId===loId))).sort((a,b)=>a[1].rules[0].year-b[1].rules[0].year);
        const yearsForLo=[...new Set(available.map(([,g])=>g.rules[0].year))];
        const selectionKey=selectedUo+'|'+loId;
        const preferred=loYears[selectionKey]??(year!==0?year:yearsForLo[0]);
        const selectedYear=yearsForLo.includes(preferred)?preferred:yearsForLo[0];
        const selectedEntry=available.find(([,g])=>g.rules[0].year===selectedYear);
        if(!selectedEntry)return null;
        const [key,group]=selectedEntry;
        const items=new Map<string,AllocationPreview['items'][number]>();
        for(const preview of group.previews)for(const item of preview.items){
         const prior=items.get(item.loId);
         items.set(item.loId,prior?{...prior,total:prior.total+item.total,development:prior.development+item.development,maintenance:prior.maintenance+item.maintenance}:item);
        }
        const combined:AllocationPreview={ruleId:key,fingerprint:group.previews.map(p=>p.fingerprint).join('|'),items:[...items.values()],uo:{development:group.previews.reduce((v,p)=>v+p.uo.development,0),maintenance:group.previews.reduce((v,p)=>v+p.uo.maintenance,0)}};
        const legacy=group.rules.some(rule=>(gaps.activityAllocationDecisions??[]).find(d=>d.ruleId===rule.id)?.sharedPercentages);
        return <section key={selectionKey} className="panel" aria-label={'LO-fördelning '+name(loId)}>
         <h4>{loId.startsWith('uo-overhead:')?'UO Övergripande':name(loId)}</h4>
         <PeriodButtons years={yearsForLo} selected={selectedYear} onSelect={next=>setLoYears(prev=>({...prev,[selectionKey]:next===0?yearsForLo[0]:next}))} label={'LO-period '+name(loId)}/>
         {legacy&&<p>Äldre godkännande: välj en ny balanserad fördelning för att ändra värdet.</p>}
         <LoAllocationDraft key={key+group.previews.map(p=>p.fingerprint).join('|')+loId} preview={combined} decision={(gaps.activityAllocationDecisions??[]).find(d=>d.ruleId===group.rules[0].id)} balancedPreviews={group.previews} cards onlyLoId={loId} quick onApprove={(overrides,reason)=>saveGroup(group,overrides,reason)}/>
        </section>;
       });
      })()}
      {rows.length===0?<p>Inga importerade UO-matriser att visa.</p>:<section className="panel" aria-label="Översikt UO-fördelningar">
       <h4>UO-fördelningar</h4>
       {rows.filter(r=>!selectedUo||r.key===selectedUo).map(r=><div className="panel" key={r.key} style={{marginTop:8}}>
        <button type="button" className="secondary" aria-expanded={selectedUo===r.key} style={{display:'block',width:'100%',textAlign:'left',padding:12}} onClick={()=>{setSelectedUo(v=>v===r.key?null:r.key);void 0}}>
         <strong>{r.title} {selectedUo===r.key?'▾':'›'}</strong>
         <DistributionIndicator first={r.values.first} second={r.values.second} labels={[first,second]}/>
         <small>{r.status}</small>
        </button>
        <PeriodButtons years={years} selected={year} onSelect={setYear} label={'UO-år '+r.title}/>
        {selectedUo===r.key&&<section aria-label={'LO-detaljer '+r.title}>
         <h4>{r.title} – fördelning</h4>
         <DistributionIndicator first={r.values.first} second={r.values.second} labels={[first,second]}/>
         <p>Importerade originalvärden är skrivskyddade.</p>
         {kind==='metric'&&<p>IT- och verksamhetstimmar är importerade och kan inte redigeras.</p>}
         {kind==='metric'&&(()=>{
          const loValues=new Map<string,Values>();
          for(const metric of ['it_hours','business_hours'] as const)for(const original of annual(data.records,metric,year)){
           if(original.scope.axis!=='work'||original.scope.uoId!==r.key)continue;
           const loId=original.scope.loId??(original.workPart==='uo-overhead'?'uo-overhead:'+r.key:null);
           if(!loId)continue;
           const values=loValues.get(loId)??{first:0,second:0};
           values[metric==='it_hours'?'first':'second']+=original.value;loValues.set(loId,values);
          }
          return <section aria-label={'LO-värden '+r.title}>
           <h4>LO-fördelningar</h4>
           {[...loValues].map(([loId,values])=><div key={loId} className="panel" style={{marginTop:8}}>
            <strong>{loId.startsWith('uo-overhead:')?'UO Övergripande':name(loId)}</strong>
            <DistributionIndicator first={values.first} second={values.second} labels={['IT-timmar','Verksamhetstimmar']}/>
            <small>Importerad · skrivskyddad</small>
           </div>)}
          </section>;
         })()}

         {kind==='activity'&&<p>Godkända LO-kompletteringar och möjligheten att ändra redigerbara LO visas ovan.</p>}
        </section>}
       </div>)}
      </section>}
    </section>}
   </div>;
  })}
 </section>;
}
