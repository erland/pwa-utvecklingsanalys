import {useState} from 'react';
import {approvedActivityParts,previewActivityAllocation,approveBalancedActivityGroup,applySharedPercentages,type ActivityAllocationRule,type AllocationPreview} from '../domain/activityAllocation';
import LoAllocationDraft from '../gaps/LoAllocationDraft';
import {rebalanceUoBudgetAllocation} from '../import/formats/uoBudgetCompletion';
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
 const [metricLoYears,setMetricLoYears]=useState<Record<string,number>>({});
 const editorGroups=new Map<string,{rules:ActivityAllocationRule[];previews:AllocationPreview[]}>();
 const candidateRules=new Map<string,ActivityAllocationRule>();
 for(const record of data.records){
  if(record.authority!=='original'||record.granularity!=='activity-part'||record.scope.axis!=='work'||record.scope.loId||!record.source||!['it_hours','business_hours'].includes(record.metric))continue;
  const match={datasetId:record.source.datasetId,uoId:record.scope.uoId,metric:record.metric as 'it_hours'|'business_hours',year:record.year};
  const key=JSON.stringify(match);
  const existing=(gaps.activityAllocationRules??[]).find(r=>r.datasetId===match.datasetId&&r.uoId===match.uoId&&r.metric===match.metric&&r.year===match.year);
  candidateRules.set(key,existing??{...match,id:key,reason:'Komplettering från UO-budgetformat'});
 }
 for(const rule of candidateRules.values()){
  const decision=(gaps.activityAllocationDecisions??[]).find(d=>d.ruleId===rule.id);
  // Missing approval must not hide an editable LO; the source preview is sufficient.
  if(decision&&decision.fingerprint&&!approvedActivityParts(data,rule,decision).length)continue;
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
  const rules=[...(latest.activityAllocationRules??[])];
  for(const rule of group.rules)if(!rules.some(r=>r.id===rule.id))rules.push(rule);
  for(let i=0;i<group.rules.length;i++){
   const ruleId=group.rules[i].id;
   const index=decisions.findIndex(d=>d.ruleId===ruleId);
   if(index<0)decisions.push(approvals[i]);
   else decisions[index]=approvals[i];
  }
  const next={...latest,activityAllocationRules:rules,activityAllocationDecisions:decisions};
  await saveGapState(next);onSaved(next);
 };
 const saveAcrossYears=async(groups:{rules:ActivityAllocationRule[];previews:AllocationPreview[]}[],overrides:{loId:string;developmentPercent:number}[],reason:string)=>{
  // Validate all target years before persisting a single atomic state update.
  const approvals=groups.flatMap(group=>approveBalancedActivityGroup(group.previews,reason,overrides));
  const current=await loadGapState();
  const selectedRules=groups.flatMap(group=>group.rules);
  for(const rule of selectedRules){
   const shown=(gaps.activityAllocationDecisions??[]).find(d=>d.ruleId===rule.id);
   const latest=(current.activityAllocationDecisions??[]).find(d=>d.ruleId===rule.id);
   if(JSON.stringify(shown)!==JSON.stringify(latest))throw new Error('Fördelningen har ändrats. Ladda om sidan.');
  }
  const ruleIds=new Set(selectedRules.map(rule=>rule.id));
  const rules=[...(current.activityAllocationRules??[])];
  for(const rule of selectedRules)if(!rules.some(r=>r.id===rule.id))rules.push(rule);
  const next={...current,activityAllocationRules:rules,activityAllocationDecisions:[...(current.activityAllocationDecisions??[]).filter(d=>!ruleIds.has(d.ruleId)),...approvals]};
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
      {selectedUo&&<button type="button" className="secondary" onClick={()=>{setSelectedUo(null);void 0}}>← Alla UO</button>}
      {rows.length===0?<p>Inga importerade UO-matriser att visa.</p>:<section className="panel" aria-label="Översikt UO-fördelningar">
       <h4>UO-fördelningar</h4>
       {rows.filter(r=>!selectedUo||r.key===selectedUo).map(r=><div className="panel" key={r.key} style={{marginTop:8}}>
        <button type="button" className="secondary" aria-expanded={selectedUo===r.key} style={{display:'block',width:'100%',textAlign:'left',padding:12}} onClick={()=>{setSelectedUo(v=>v===r.key?null:r.key);void 0}}>
         <strong>{r.title} {selectedUo===r.key?'▾':'›'}</strong>
         <small>{r.status}</small>
        </button>
        <PeriodButtons years={years} selected={year} onSelect={setYear} label={'UO-år '+r.title}/>
        <DistributionIndicator first={r.values.first} second={r.values.second} labels={[first,second]}/>
        {selectedUo===r.key&&<section aria-label={'LO-detaljer '+r.title}>

         {kind==='metric'&&(()=>{
          const loValues=new Map<string,Values>();
          for(const metric of ['it_hours','business_hours'] as const)for(const original of annual(data.records,metric,0)){
           if(original.scope.axis!=='work'||original.scope.uoId!==r.key)continue;
           const loId=original.scope.loId??(original.workPart==='uo-overhead'?'uo-overhead:'+r.key:null);
           if(!loId)continue;
           const values=loValues.get(loId)??{first:0,second:0};
           values[metric==='it_hours'?'first':'second']+=original.value;loValues.set(loId,values);
          }
          return <section aria-label={'LO-värden '+r.title}>
           <h4>LO-fördelningar</h4>
           {[...loValues].map(([loId])=>{
            const key=r.key+'|'+loId;
            const selected=metricLoYears[key]??year;
            const totals={first:0,second:0};
            for(const metric of ['it_hours','business_hours'] as const)for(const original of annual(data.records,metric,selected)){
             if(original.scope.axis!=='work'||original.scope.uoId!==r.key)continue;
             const id=original.scope.loId??(original.workPart==='uo-overhead'?'uo-overhead:'+r.key:null);
             if(id!==loId)continue;
             totals[metric==='it_hours'?'first':'second']+=original.value;
            }
            return <section key={loId} className="panel" aria-label={'LO-värden '+name(loId)} style={{marginTop:8}}>
             <strong>{loId.startsWith('uo-overhead:')?'UO Övergripande':name(loId)}</strong>
             <PeriodButtons years={years} selected={selected} onSelect={next=>setMetricLoYears(prev=>({...prev,[key]:next}))} label={'LO-period '+name(loId)}/>
             <DistributionIndicator first={totals.first} second={totals.second} labels={['IT-timmar','Verksamhetstimmar']}/>
             <small>Importerad · skrivskyddad</small>
            </section>;
           })}
          </section>;
         })()}

         {kind==='activity'&&(()=>{
       // One persistent LO card across years. Each card selects the annual approval independently.
       const groupEntries=[...editorGroups].filter(([,group])=>group.rules[0].uoId===r.key);
       const loIds=[...new Set(groupEntries.flatMap(([,group])=>group.previews.flatMap(p=>p.items.map(i=>i.loId))))].sort((a,b)=>name(a).localeCompare(name(b),'sv'));
       return loIds.map(loId=>{
        const available=groupEntries.filter(([,group])=>group.previews.some(p=>p.items.some(i=>i.loId===loId))).sort((a,b)=>a[1].rules[0].year-b[1].rules[0].year);
        const yearsForLo=[...new Set(available.map(([,g])=>g.rules[0].year))];
        const selectionKey=r.key+'|'+loId;
        const preferred=loYears[selectionKey]??(year!==0?year:0);
        const selectedYear=preferred===0?0:yearsForLo.includes(preferred)?preferred:yearsForLo[0];
        const selectedEntry=available.find(([,g])=>g.rules[0].year===(selectedYear===0?yearsForLo[0]:selectedYear));
        if(!selectedEntry)return null;
        const [key,group]=selectedEntry;
        const previewGroups=selectedYear===0?available.map(([,g])=>g):[group];
        const activeItems=new Map<string,AllocationPreview['items'][number]>();
        for(const g of previewGroups)for(const p of g.previews){
         const decision=(gaps.activityAllocationDecisions??[]).find(d=>d.ruleId===p.ruleId&&d.fingerprint===p.fingerprint);
         let displayed=p;
         if(selectedYear===0&&decision){
          try{displayed=decision.sharedPercentages?applySharedPercentages(p,decision.overrides??[]):rebalanceUoBudgetAllocation(p,decision.overrides??[],p.lockedLo??[])}catch{displayed=p}
         }
         for(const item of displayed.items){const previous=activeItems.get(item.loId);activeItems.set(item.loId,previous?{...previous,total:previous.total+item.total,development:previous.development+item.development,maintenance:previous.maintenance+item.maintenance}:item)}
        }
        const combined:AllocationPreview={ruleId:key,fingerprint:previewGroups.flatMap(g=>g.previews.map(p=>p.fingerprint)).join('|'),items:[...activeItems.values()],uo:{development:previewGroups.flatMap(g=>g.previews).reduce((v,p)=>v+p.uo.development,0),maintenance:previewGroups.flatMap(g=>g.previews).reduce((v,p)=>v+p.uo.maintenance,0)}};
        return <section key={selectionKey} className="panel" aria-label={'LO-fördelning '+name(loId)}>
         <h4>{loId.startsWith('uo-overhead:')?'UO Övergripande':name(loId)}</h4>
         <PeriodButtons years={yearsForLo} selected={selectedYear} onSelect={next=>setLoYears(prev=>({...prev,[selectionKey]:next}))} label={'LO-period '+name(loId)}/>

         <LoAllocationDraft key={JSON.stringify([key,loId,selectedYear,previewGroups.flatMap(g=>g.previews.map(p=>p.fingerprint)),(gaps.activityAllocationDecisions??[]).filter(d=>group.rules.some(rule=>rule.id===d.ruleId)).map(d=>d.overrides)])} preview={combined} decision={selectedYear===0?undefined:(gaps.activityAllocationDecisions??[]).find(d=>d.ruleId===group.rules[0].id)} balancedPreviews={previewGroups.flatMap(g=>g.previews)} cards onlyLoId={loId} quick autoSave onApprove={(overrides,reason)=>selectedYear===0?saveAcrossYears(available.map(([,g])=>g),overrides,reason):saveGroup(group,overrides,reason)}/>
        </section>;
       });
      })()}

        </section>}
       </div>)}
      </section>}
    </section>}
   </div>;
  })}
 </section>;
}
