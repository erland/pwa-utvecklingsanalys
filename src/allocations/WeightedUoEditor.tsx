import {useMemo,useRef,useState} from 'react';
import type {CanonicalDataset} from '../domain/canonical';
import type {GapState} from '../gaps/store';
import {analyzeCanonical} from '../analytics/canonicalQuery';
import type {OptionalAllocations,OptionalAllocationDimension} from './optionalModel';
import {effectiveOptionalRule} from './optionalAnalysis';
import {applyProportionalScope} from './proportionalScope';
import {optionalAllocationKey,type OptionalAllocationRule,type OptionalAllocationScope} from './optionalModel';
import {partKey,percentagesFor,putPartRules,shiftBinaryUo,weightedSummary,type WeightedPart} from './weightedSync';

const name=(id:string)=>decodeURIComponent(id.split(':').at(-1)??id);
const format=(value:number)=>new Intl.NumberFormat('sv-SE',{maximumFractionDigits:1}).format(value);

function LoYearOverride({data,gaps,config,dimension,scope,year,onSave}:{data:CanonicalDataset;gaps:GapState;config:OptionalAllocations;dimension:OptionalAllocationDimension;scope:OptionalAllocationScope;year:number;onSave:(next:OptionalAllocations)=>Promise<void>}){
 const first=dimension.categories[0].id,second=dimension.categories[1].id;
 const effective=effectiveOptionalRule(config,dimension.id,year,scope).rule?.percentages;
 const uoAnnualPercent=scope.kind==='uo'?(()=>{
  const result=analyzeCanonical(data,gaps,{axis:'work',metrics:dimension.appliesTo.metrics,activity:dimension.appliesTo.activities==='all'||dimension.appliesTo.activities.length===2?'all':dimension.appliesTo.activities[0],year,detailUoId:scope.uoId});
  const total=result.rows.reduce((n,row)=>n+Math.max(0,row.value),0);
  const a=result.rows.reduce((n,row)=>{
   const partScope:WeightedPart['scope']=row.key===scope.uoId||row.key==='uo-overhead:'+scope.uoId?{kind:'uo-overhead',uoId:scope.uoId}:{kind:'lo',uoId:scope.uoId,loId:row.key};
   return n+Math.max(0,row.value)*(percentagesFor(config,dimension.id,year,partScope,[first,second])[first]??0)/100;
  },0);
  return total?100*a/total:0;
 })():null;
 const own=config.rules.find(r=>r.dimensionId===dimension.id&&r.year===year&&r.scope.kind===scope.kind&&r.scope.uoId===scope.uoId&&(scope.kind!=='lo'||r.scope.kind==='lo'&&r.scope.loId===scope.loId));
 const [value,setValue]=useState(uoAnnualPercent??effective?.[first]??0),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const dirty=useRef(false);
 const save=async()=>{
  if(!dirty.current||busy)return;dirty.current=false;setBusy(true);setError('');
  try{
   const rule:OptionalAllocationRule={dimensionId:dimension.id,year,scope,percentages:{[first]:value,[second]:100-value}};
   const key=optionalAllocationKey(rule);
   await onSave(scope.kind==='uo'?applyProportionalScope(data,gaps,config,dimension,{uoId:scope.uoId,year},value):{...config,rules:[...config.rules.filter(r=>optionalAllocationKey(r)!==key),rule]});
  }catch(e){dirty.current=true;setError(String(e))}finally{setBusy(false)}
 };
 const remove=async()=>{
  if(!own||busy)return;setBusy(true);setError('');
  try{await onSave({...config,rules:config.rules.filter(r=>optionalAllocationKey(r)!==optionalAllocationKey(own))})}catch(e){setError(String(e))}finally{setBusy(false)}
 };
 return <div className="panel" aria-label={'Årsundantag '+year} style={{marginTop:8,padding:10}}>
  <p><strong>{year}</strong> · {scope.kind==='uo'?'Timviktad UO-fördelning':own?'Eget årsundantag':effective?'Ärver gällande fördelning':'Ingen fördelning'}</p>
  <label>{dimension.categories[0].name}: {format(value)} % / {dimension.categories[1].name}: {format(100-value)} %
   <input type="range" aria-label={'Årsfördelning '+year} min="0" max="100" step="0.1" value={value} disabled={busy} onChange={e=>{dirty.current=true;setValue(Number(e.target.value))}} onPointerUp={()=>void save()} onKeyUp={e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown'].includes(e.key))void save()}} onBlur={()=>void save()} style={{display:'block',width:'100%'}}/>
  </label>
  {own&&<button type="button" className="secondary" disabled={busy} onClick={()=>void remove()}>Ta bort årsundantag {year}</button>}
  {error&&<p role="alert">{error}</p>}
 </div>;
}

export default function WeightedUoEditor({data,gaps,config,dimension,year,uoId,onSave}:{data:CanonicalDataset;gaps:GapState;config:OptionalAllocations;dimension:OptionalAllocationDimension;year:number;uoId:string;onSave:(next:OptionalAllocations)=>Promise<void>}){
 const [activeYears,setActiveYears]=useState<Record<string,number|null>>({}),[activeUoYear,setActiveUoYear]=useState<number|null>(null),[pending,setPending]=useState<Map<string,Record<string,number>>|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const pendingRef=useRef<Map<string,Record<string,number>>|null>(null);
 const savingRef=useRef(false);
 const editRef=useRef<{kind:'uo'|'part';target:number;part?:WeightedPart}|null>(null);
 const first=dimension.categories[0].id,second=dimension.categories[1].id;
 const detail=useMemo(()=>{
  const years=year===0?[...new Set(data.records.filter(r=>r.scope.axis==='work'&&r.scope.uoId===uoId).map(r=>r.year))]:[year];
  const totals=new Map<string,{key:string;label:string;value:number}>();
  const annualRows:{year:number;key:string;value:number}[]=[];
  let unknownCount=0,coverage='';
  for(const y of years){
   const result=analyzeCanonical(data,gaps,{axis:'work',metrics:dimension.appliesTo.metrics,activity:dimension.appliesTo.activities==='all'||dimension.appliesTo.activities.length===2?'all':dimension.appliesTo.activities[0],year:y,detailUoId:uoId});
   unknownCount+=result.unknownCount;coverage=result.coverage;
   for(const row of result.rows){annualRows.push({year:y,key:row.key,value:row.value});const previous=totals.get(row.key);totals.set(row.key,{...row,value:row.value+(previous?.value??0)})}
  }
  return {rows:[...totals.values()],annualRows,unknownCount,coverage};
 },[data,gaps,dimension,year,uoId]);
 const parts:WeightedPart[]=detail.rows.filter(r=>r.value>0).map(r=>({scope:r.key==='uo-overhead:'+uoId||r.key===uoId?{kind:'uo-overhead',uoId}: {kind:'lo',uoId,loId:r.key},hours:r.value}));
 const base=new Map(parts.map(p=>{
  const key=p.scope.kind==='lo'?p.scope.loId:'uo-overhead:'+uoId;
  const rows=detail.annualRows.filter(r=>r.key===key||(p.scope.kind==='uo-overhead'&&r.key===uoId));
  const total=rows.reduce((n,r)=>n+r.value,0);
  const allocated=rows.reduce((n,r)=>n+r.value*(percentagesFor(config,dimension.id,r.year,p.scope,[first,second])[first]??0),0);
  const proportion=total?allocated/total:0;
  return [partKey(p.scope),{[first]:proportion,[second]:total?rows.reduce((n,r)=>n+r.value*(percentagesFor(config,dimension.id,r.year,p.scope,[first,second])[second]??0),0)/total:0}] as const;
 }));
 const values=pending??base;
 const rollup=weightedSummary(parts,values,[first,second]);
 const change=(next:Map<string,Record<string,number>>)=>{pendingRef.current=next;setPending(next);setError('')};
 const setUo=(target:number)=>{editRef.current={kind:'uo',target};change(shiftBinaryUo(parts,pendingRef.current??base,first,second,target))};
 const setPart=(part:WeightedPart,target:number)=>{editRef.current={kind:'part',part,target};change(new Map(pendingRef.current??base).set(partKey(part.scope),{[first]:target,[second]:100-target}))};
 const save=async()=>{
  const snapshot=pendingRef.current;
  if(!snapshot||savingRef.current)return;
  savingRef.current=true;setBusy(true);setError('');
  try{
   const edit=editRef.current;
   await onSave(edit?applyProportionalScope(data,gaps,config,dimension,{uoId,year,...(edit.kind==='part'?(edit.part!.scope.kind==='lo'?{loId:edit.part!.scope.loId}:{overhead:true}):{})},edit.target):putPartRules(config,dimension.id,year,parts,snapshot));
   editRef.current=null;
   pendingRef.current=null;setPending(null);
  }catch(e){setError('Kunde inte spara fördelningen: '+String(e))}
  finally{savingRef.current=false;setBusy(false)}
 };
 // Pointer release commits one snapshot; keyboard updates commit on key release.
 const finishKey=(key:string)=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown'].includes(key))void save()};

 return <section className="panel" aria-label={'Timviktad fördelning '+name(uoId)} style={{minWidth:0,marginTop:12}}>
  <h4>{name(uoId)} – LO-översikt</h4><p>Alla LO visas direkt. Grundfördelningen justeras nedan och årsundantag öppnas per LO.</p>
  {year===0&&<p>Grundfördelning för samtliga år. Årsvisa undantag behålls.</p>}
  <p><strong>{format(rollup.hours)} {dimension.appliesTo.metrics[0].endsWith('_hours')?'h':'SEK'}</strong> · {format(rollup.allocatedHours[first])} {dimension.appliesTo.metrics[0].endsWith('_hours')?'h':'SEK'} {dimension.categories[0].name} ({format(rollup.percentages[first])} %) · {format(rollup.allocatedHours[second])} {dimension.appliesTo.metrics[0].endsWith('_hours')?'h':'SEK'} {dimension.categories[1].name} ({format(rollup.percentages[second])} %)</p>
  <label>UO – Fördelningsreglage<input type="range" min="0" max="100" step="0.1" aria-label={'UO '+name(uoId)+' – Fördelningsreglage'} value={rollup.percentages[first]} disabled={rollup.hours===0||busy} onChange={e=>setUo(Number(e.target.value))} onPointerUp={()=>void save()} onKeyUp={e=>finishKey(e.key)} onBlur={()=>void save()} style={{display:'block',width:'100%'}}/></label>
  {year===0&&<section aria-label="UO årsundantag" className="panel" style={{padding:12,marginTop:12}}>
   <strong>UO per år</strong>
   <div className="actions">{[...new Set(data.records.filter(r=>r.scope.axis==='work'&&r.scope.uoId===uoId).map(r=>r.year))].sort().map(y=><button type="button" className="secondary" key={y} aria-expanded={activeUoYear===y} onClick={()=>setActiveUoYear(old=>old===y?null:y)}>{y}{config.rules.some(r=>r.dimensionId===dimension.id&&r.year===y&&r.scope.kind==='uo'&&r.scope.uoId===uoId)?' •':''}</button>)}</div>
   {activeUoYear!==null&&<LoYearOverride key={'uo-'+activeUoYear+'-'+config.rules.length} data={data} gaps={gaps} config={config} dimension={dimension} scope={{kind:'uo',uoId}} year={activeUoYear} onSave={onSave}/>}
  </section>}
  {<div aria-label="LO-översikt" style={{minWidth:0}}>{parts.map(p=>{const current=values.get(partKey(p.scope))??{};const share=current[first]??0;const allocated=(current[first]??0)+(current[second]??0);const direct=config.rules.some(r=>r.dimensionId===dimension.id&&r.year===year&&r.scope.kind===p.scope.kind&&r.scope.uoId===uoId&&(p.scope.kind!=='lo'||r.scope.kind==='lo'&&r.scope.loId===p.scope.loId));return <div key={partKey(p.scope)} className="panel" style={{marginTop:8,minWidth:0,padding:12}}><strong>{p.scope.kind==='uo-overhead'?'UO Övergripande':name(p.scope.loId)}</strong><p style={{margin:'4px 0'}}>{format(p.hours)} {dimension.appliesTo.metrics[0].endsWith('_hours')?'h':'SEK'} · {direct?'Egen regel':allocated>0?'Ärvd fördelning':'Saknar fördelning'}</p><div role="img" aria-label={(p.scope.kind==='uo-overhead'?'UO Övergripande':name(p.scope.loId))+' – '+dimension.categories[0].name+' '+format(share)+' procent'} style={{display:'flex',height:10,borderRadius:5,overflow:'hidden',width:'100%',background:'#e2e8f0'}}><span style={{width:share+'%',background:'#2563eb'}}/><span style={{width:(current[second]??0)+'%',background:'#0d9488'}}/></div><p style={{margin:'4px 0'}}>{format(share)} % / {format(current[second]??0)} %</p>
   <label>{p.scope.kind==='uo-overhead'?'UO Övergripande':name(p.scope.loId)} – {format(p.hours)} {dimension.appliesTo.metrics[0].endsWith('_hours')?'h':'SEK'}
    <input type="range" min="0" max="100" step="0.1" aria-label={(p.scope.kind==='uo-overhead'?'UO Övergripande':name(p.scope.loId))+' – Fördelningsreglage'} value={values.get(partKey(p.scope))?.[first]??0} disabled={busy} onChange={e=>setPart(p,Number(e.target.value))} onPointerUp={()=>void save()} onKeyUp={e=>finishKey(e.key)} onBlur={()=>void save()} style={{display:'block',width:'100%'}}/>
   </label><p>{format(p.hours*(values.get(partKey(p.scope))?.[first]??0)/100)} {dimension.appliesTo.metrics[0].endsWith('_hours')?'h':'SEK'} {dimension.categories[0].name} ({format(values.get(partKey(p.scope))?.[first]??0)} %) · {format(p.hours*(values.get(partKey(p.scope))?.[second]??0)/100)} {dimension.appliesTo.metrics[0].endsWith('_hours')?'h':'SEK'} {dimension.categories[1].name} ({format(values.get(partKey(p.scope))?.[second]??0)} %)</p>
  {year===0&&<div style={{marginTop:8}}><div className="actions">{[...new Set(data.records.filter(r=>r.scope.axis==='work'&&r.scope.uoId===uoId).map(r=>r.year))].sort().map(y=><button key={y} type="button" className="secondary" aria-expanded={activeYears[partKey(p.scope)]===y} onClick={()=>setActiveYears(prev=>({...prev,[partKey(p.scope)]:prev[partKey(p.scope)]===y?null:y}))}>{y}{config.rules.some(r=>r.dimensionId===dimension.id&&r.year===y&&r.scope.kind===p.scope.kind&&r.scope.uoId===uoId&&(p.scope.kind!=='lo'||r.scope.kind==='lo'&&r.scope.loId===p.scope.loId))?' •':''}</button>)}</div>{activeYears[partKey(p.scope)]!=null&&<LoYearOverride key={partKey(p.scope)+'-'+activeYears[partKey(p.scope)]+'-'+config.rules.length} config={config} dimension={dimension} scope={p.scope} year={activeYears[partKey(p.scope)]!} onSave={onSave}/>}</div>}
  </div>})}</div>}
  {detail.unknownCount>0&&<p role="status">Ofullständig aktivitetstäckning: {detail.coverage}</p>}
  {error&&<p role="alert">{error}</p>}
  {busy&&<p role="status">Sparar fördelningen…</p>}
  {error&&pending&&<button type="button" className="secondary" disabled={busy} onClick={()=>void save()}>Försök spara igen</button>}
 </section>;
}
