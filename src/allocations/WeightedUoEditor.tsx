import {useMemo,useRef,useState} from 'react';
import type {CanonicalDataset} from '../domain/canonical';
import type {GapState} from '../gaps/store';
import {analyzeCanonical} from '../analytics/canonicalQuery';
import type {OptionalAllocations,OptionalAllocationDimension} from './optionalModel';
import {partKey,percentagesFor,putPartRules,shiftBinaryUo,weightedSummary,type WeightedPart} from './weightedSync';

const name=(id:string)=>decodeURIComponent(id.split(':').at(-1)??id);
const format=(value:number)=>new Intl.NumberFormat('sv-SE',{maximumFractionDigits:1}).format(value);
export default function WeightedUoEditor({data,gaps,config,dimension,year,uoId,onSave}:{data:CanonicalDataset;gaps:GapState;config:OptionalAllocations;dimension:OptionalAllocationDimension;year:number;uoId:string;onSave:(next:OptionalAllocations)=>Promise<void>}){
 const [expanded,setExpanded]=useState(true),[pending,setPending]=useState<Map<string,Record<string,number>>|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const pendingRef=useRef<Map<string,Record<string,number>>|null>(null);
 const savingRef=useRef(false);
 const first=dimension.categories[0].id,second=dimension.categories[1].id;
 const detail=useMemo(()=>{
  const years=year===0?[...new Set(data.records.filter(r=>r.scope.axis==='work'&&r.scope.uoId===uoId).map(r=>r.year))]:[year];
  const totals=new Map<string,{key:string;label:string;value:number}>();
  let unknownCount=0,coverage='';
  for(const y of years){
   const result=analyzeCanonical(data,gaps,{axis:'work',metrics:dimension.appliesTo.metrics,activity:dimension.appliesTo.activities==='all'||dimension.appliesTo.activities.length===2?'all':dimension.appliesTo.activities[0],year:y,detailUoId:uoId});
   unknownCount+=result.unknownCount;coverage=result.coverage;
   for(const row of result.rows){const previous=totals.get(row.key);totals.set(row.key,{...row,value:row.value+(previous?.value??0)})}
  }
  return {rows:[...totals.values()],unknownCount,coverage};
 },[data,gaps,dimension,year,uoId]);
 const parts:WeightedPart[]=detail.rows.filter(r=>r.value>0).map(r=>({scope:r.key==='uo-overhead:'+uoId||r.key===uoId?{kind:'uo-overhead',uoId}: {kind:'lo',uoId,loId:r.key},hours:r.value}));
 const base=useMemo(()=>new Map(parts.map(p=>[partKey(p.scope),percentagesFor(config,dimension.id,year,p.scope,[first,second])])),[config,dimension,year,first,second,detail]);
 const values=pending??base;
 const rollup=weightedSummary(parts,values,[first,second]);
 const change=(next:Map<string,Record<string,number>>)=>{pendingRef.current=next;setPending(next);setError('')};
 const setUo=(target:number)=>change(shiftBinaryUo(parts,pendingRef.current??base,first,second,target));
 const setPart=(part:WeightedPart,target:number)=>change(new Map(pendingRef.current??base).set(partKey(part.scope),{[first]:target,[second]:100-target}));
 const save=async()=>{
  const snapshot=pendingRef.current;
  if(!snapshot||savingRef.current)return;
  savingRef.current=true;setBusy(true);setError('');
  try{
   await onSave(putPartRules(config,dimension.id,year,parts,snapshot));
   pendingRef.current=null;setPending(null);
  }catch(e){setError('Kunde inte spara fördelningen: '+String(e))}
  finally{savingRef.current=false;setBusy(false)}
 };
 // Pointer release commits one snapshot; keyboard updates commit on key release.
 const finishKey=(key:string)=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown'].includes(key))void save()};

 return <section className="panel" aria-label={'Timviktad fördelning '+name(uoId)} style={{minWidth:0,marginTop:12}}>
  <h4>{name(uoId)} – LO-översikt</h4><p>Alla LO visas direkt med aktuell fördelning. Justera respektive LO nedan.</p><button type="button" className="secondary" aria-expanded={expanded} onClick={()=>setExpanded(v=>!v)}>{expanded?'Dölj LO':'Visa LO'}</button>
  {year===0&&<p>Grundfördelning för samtliga år. Årsvisa undantag behålls.</p>}
  <p><strong>{format(rollup.hours)} {dimension.appliesTo.metrics[0].endsWith('_hours')?'h':'SEK'}</strong> · {format(rollup.allocatedHours[first])} {dimension.appliesTo.metrics[0].endsWith('_hours')?'h':'SEK'} {dimension.categories[0].name} ({format(rollup.percentages[first])} %) · {format(rollup.allocatedHours[second])} {dimension.appliesTo.metrics[0].endsWith('_hours')?'h':'SEK'} {dimension.categories[1].name} ({format(rollup.percentages[second])} %)</p>
  <label>UO – Fördelningsreglage<input type="range" min="0" max="100" step="0.1" aria-label={'UO '+name(uoId)+' – Fördelningsreglage'} value={rollup.percentages[first]} disabled={rollup.hours===0||busy} onChange={e=>setUo(Number(e.target.value))} onPointerUp={()=>void save()} onKeyUp={e=>finishKey(e.key)} onBlur={()=>void save()} style={{display:'block',width:'100%'}}/></label>
  {expanded&&<div aria-label="LO-översikt" style={{minWidth:0}}>{parts.map(p=>{const current=values.get(partKey(p.scope))??{};const share=current[first]??0;const allocated=(current[first]??0)+(current[second]??0);const direct=config.rules.some(r=>r.dimensionId===dimension.id&&r.year===year&&r.scope.kind===p.scope.kind&&r.scope.uoId===uoId&&(p.scope.kind!=='lo'||r.scope.kind==='lo'&&r.scope.loId===p.scope.loId));return <div key={partKey(p.scope)} className="panel" style={{marginTop:8,minWidth:0,padding:12}}><strong>{p.scope.kind==='uo-overhead'?'UO Övergripande':name(p.scope.loId)}</strong><p style={{margin:'4px 0'}}>{format(p.hours)} {dimension.appliesTo.metrics[0].endsWith('_hours')?'h':'SEK'} · {direct?'Egen regel':allocated>0?'Ärvd fördelning':'Saknar fördelning'}</p><div role="img" aria-label={(p.scope.kind==='uo-overhead'?'UO Övergripande':name(p.scope.loId))+' – '+dimension.categories[0].name+' '+format(share)+' procent'} style={{display:'flex',height:10,borderRadius:5,overflow:'hidden',width:'100%',background:'#e2e8f0'}}><span style={{width:share+'%',background:'#2563eb'}}/><span style={{width:(current[second]??0)+'%',background:'#0d9488'}}/></div><p style={{margin:'4px 0'}}>{format(share)} % / {format(current[second]??0)} %</p>
   <label>{p.scope.kind==='uo-overhead'?'UO Övergripande':name(p.scope.loId)} – {format(p.hours)} {dimension.appliesTo.metrics[0].endsWith('_hours')?'h':'SEK'}
    <input type="range" min="0" max="100" step="0.1" aria-label={(p.scope.kind==='uo-overhead'?'UO Övergripande':name(p.scope.loId))+' – Fördelningsreglage'} value={values.get(partKey(p.scope))?.[first]??0} disabled={busy} onChange={e=>setPart(p,Number(e.target.value))} onPointerUp={()=>void save()} onKeyUp={e=>finishKey(e.key)} onBlur={()=>void save()} style={{display:'block',width:'100%'}}/>
   </label><p>{format(p.hours*(values.get(partKey(p.scope))?.[first]??0)/100)} {dimension.appliesTo.metrics[0].endsWith('_hours')?'h':'SEK'} {dimension.categories[0].name} ({format(values.get(partKey(p.scope))?.[first]??0)} %) · {format(p.hours*(values.get(partKey(p.scope))?.[second]??0)/100)} {dimension.appliesTo.metrics[0].endsWith('_hours')?'h':'SEK'} {dimension.categories[1].name} ({format(values.get(partKey(p.scope))?.[second]??0)} %)</p>
  </div>})}</div>}
  {detail.unknownCount>0&&<p role="status">Ofullständig aktivitetstäckning: {detail.coverage}</p>}
  {error&&<p role="alert">{error}</p>}
  {busy&&<p role="status">Sparar fördelningen…</p>}
  {error&&pending&&<button type="button" className="secondary" disabled={busy} onClick={()=>void save()}>Försök spara igen</button>}
 </section>;
}
