import {useMemo,useState} from 'react';
import type {CanonicalDataset} from '../domain/canonical';
import type {GapState} from '../gaps/store';
import {analyzeCanonical} from '../analytics/canonicalQuery';
import type {OptionalAllocations,OptionalAllocationDimension} from './optionalModel';
import {partKey,percentagesFor,putPartRules,shiftBinaryUo,weightedSummary,type WeightedPart} from './weightedSync';

const name=(id:string)=>decodeURIComponent(id.split(':').at(-1)??id);
const format=(value:number)=>new Intl.NumberFormat('sv-SE',{maximumFractionDigits:1}).format(value);
export default function WeightedUoEditor({data,gaps,config,dimension,year,uoId,onSave}:{data:CanonicalDataset;gaps:GapState;config:OptionalAllocations;dimension:OptionalAllocationDimension;year:number;uoId:string;onSave:(next:OptionalAllocations)=>Promise<void>}){
 const [expanded,setExpanded]=useState(false),[pending,setPending]=useState<Map<string,Record<string,number>>|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
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
 const setUo=(target:number)=>setPending(shiftBinaryUo(parts,values,first,second,target));
 const setPart=(part:WeightedPart,target:number)=>setPending(new Map(values).set(partKey(part.scope),{[first]:target,[second]:100-target}));
 const save=async()=>{setBusy(true);setError('');try{await onSave(putPartRules(config,dimension.id,year,parts,values));setPending(null)}catch(e){setError(String(e))}finally{setBusy(false)}};
 return <section className="panel" aria-label={'Timviktad fördelning '+name(uoId)} style={{minWidth:0,marginTop:12}}>
  <button type="button" className="secondary" aria-expanded={expanded} onClick={()=>setExpanded(v=>!v)}>{expanded?'▾':'▸'} {name(uoId)} – {expanded?'Dölj LO':'Visa LO'}</button>
  {year===0&&<p>Grundfördelning för samtliga år. Årsvisa undantag behålls.</p>}
  <p><strong>{format(rollup.hours)} {dimension.appliesTo.metrics[0].endsWith('_hours')?'h':'SEK'}</strong> · {format(rollup.allocatedHours[first])} {dimension.appliesTo.metrics[0].endsWith('_hours')?'h':'SEK'} {dimension.categories[0].name} ({format(rollup.percentages[first])} %) · {format(rollup.allocatedHours[second])} {dimension.appliesTo.metrics[0].endsWith('_hours')?'h':'SEK'} {dimension.categories[1].name} ({format(rollup.percentages[second])} %)</p>
  <label>UO – Fördelningsreglage<input type="range" min="0" max="100" step="0.1" aria-label={'UO '+name(uoId)+' – Fördelningsreglage'} value={rollup.percentages[first]} disabled={rollup.hours===0} onChange={e=>setUo(Number(e.target.value))} style={{display:'block',width:'100%'}}/></label>
  {expanded&&<div style={{paddingLeft:12}}>{parts.map(p=><div key={partKey(p.scope)} className="panel" style={{marginTop:8}}>
   <label>{p.scope.kind==='uo-overhead'?'UO Övergripande':name(p.scope.loId)} – {format(p.hours)} {dimension.appliesTo.metrics[0].endsWith('_hours')?'h':'SEK'}
    <input type="range" min="0" max="100" step="0.1" aria-label={(p.scope.kind==='uo-overhead'?'UO Övergripande':name(p.scope.loId))+' – Fördelningsreglage'} value={values.get(partKey(p.scope))?.[first]??0} onChange={e=>setPart(p,Number(e.target.value))} style={{display:'block',width:'100%'}}/>
   </label><p>{format(p.hours*(values.get(partKey(p.scope))?.[first]??0)/100)} {dimension.appliesTo.metrics[0].endsWith('_hours')?'h':'SEK'} {dimension.categories[0].name} ({format(values.get(partKey(p.scope))?.[first]??0)} %) · {format(p.hours*(values.get(partKey(p.scope))?.[second]??0)/100)} {dimension.appliesTo.metrics[0].endsWith('_hours')?'h':'SEK'} {dimension.categories[1].name} ({format(values.get(partKey(p.scope))?.[second]??0)} %)</p>
  </div>)}</div>}
  {detail.unknownCount>0&&<p role="status">Ofullständig aktivitetstäckning: {detail.coverage}</p>}
  {error&&<p role="alert">{error}</p>}
  {pending&&<div className="actions"><button type="button" className="primary" disabled={busy} onClick={()=>void save()}>Spara fördelning för {name(uoId)}</button><button type="button" className="secondary" disabled={busy} onClick={()=>setPending(null)}>Ångra</button></div>}
 </section>;
}
