import {useState} from 'react';
import type {CanonicalDataset,Metric} from '../domain/canonical';
import type {GapState} from '../gaps/store';
import {loadGapState,saveGapState} from '../gaps/store';
import {uoAllocationEligibility} from './uoAllocationEligibility';
import {activeManualUoSplits,manualSplitKey,saveManualUoSplit} from './manualUoAllocation';
const display=(s:string)=>{try{return decodeURIComponent(s.split(':').at(-1)??s)}catch{return s}};
const metricNames:Partial<Record<Metric,string>>={it_hours:'IT-timmar',business_hours:'Verksamhetstimmar',other_cost:'Övriga kostnader'};
export default function ManualUoEditor({data,gaps,onSaved,year,kind,uoId}:{data:CanonicalDataset;gaps:GapState;onSaved:(next:GapState)=>void;year:number;kind:'activity'|'activity-cost';uoId?:string}){
 const [values,setValues]=useState<Record<string,string>>({});
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 const eligible=uoAllocationEligibility(data).filter(r=>(!uoId||r.uoId===uoId)&&(year===0||r.year===year)&&(kind==='activity-cost'?r.metric==='other_cost':r.metric==='it_hours'||r.metric==='business_hours'));
 const active=activeManualUoSplits(data,gaps.manualUoSplits??[]);
 const save=async(row:typeof eligible[number])=>{
  const key=manualSplitKey(row),value=Number(values[key]??active.find(d=>manualSplitKey(d)===key)?.developmentPercent??50);
  setBusy(true);setError('');
  try{
   const latest=await loadGapState();
   if(JSON.stringify(latest.manualUoSplits??[])!==JSON.stringify(gaps.manualUoSplits??[]))throw new Error('Fördelningen har ändrats i en annan flik. Ladda om.');
   const manualUoSplits=saveManualUoSplit(data,latest.manualUoSplits??[],{uoId:row.uoId,year:row.year,metric:row.metric,developmentPercent:value});
   const next={...latest,manualUoSplits};await saveGapState(next);onSaved(next);
  }catch(e){setError(String(e))}finally{setBusy(false)}
 };
 if(!eligible.length)return null;
 return <section className="panel" aria-label="Manuell UO-fördelning">
  <h4>UO-fördelningar per år och mått</h4>
  <p>Importerade fullständiga fördelningar är låsta. För saknade fördelningar kan du ange en manuell andel. Beslut sparas separat från importerad data. Sparade andelar för timmar balanseras mot LO och används i Analys. Kostnadsandelar fördelas separat på respektive kostnadsmått utan dubbelräkning.</p>
  {eligible.map(row=>{
   const key=manualSplitKey(row),current=active.find(v=>manualSplitKey(v)===key),locked=row.status==='imported-locked';
   const value=Number(values[key]??current?.developmentPercent??50);
   return <div className="panel" key={key} style={{marginTop:8}}>
    <strong>{display(row.uoId)} · {row.year} · {metricNames[row.metric]??row.metric}</strong>
    <p>{locked?'Importerad · låst':current?'Manuellt sparad':'Saknar importerad UO-fördelning'}</p>
    <label>Utveckling: {locked&&row.development!==undefined&&row.maintenance!==undefined? (row.development+row.maintenance>0?100*row.development/(row.development+row.maintenance):0).toLocaleString('sv-SE',{maximumFractionDigits:1}):value.toLocaleString('sv-SE',{maximumFractionDigits:1})} %
     <input aria-label={'UO Utveckling '+display(row.uoId)+' '+row.year+' '+row.metric} type="range" min="0" max="100" step="1" disabled={locked||busy} value={locked?(row.development!+row.maintenance!>0?100*row.development!/(row.development!+row.maintenance!):0):value} onChange={e=>setValues(old=>({...old,[key]:e.target.value}))}/>
    </label>
    {!locked&&<button className="primary" type="button" disabled={busy||!Number.isFinite(value)||value<0||value>100} onClick={()=>void save(row)}>Spara UO-fördelning</button>}
   </div>;
  })}
  {error&&<p role="alert">{error}</p>}
 </section>;
}
