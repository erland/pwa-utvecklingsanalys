import {useState} from 'react';
import type {CanonicalDataset,Metric} from '../domain/canonical';
import type {GapState} from '../gaps/store';
import {loadGapState,saveGapState} from '../gaps/store';
import {projectAllocationRows,activeProjectActivitySplits,saveProjectActivitySplit} from './projectActivityAllocation';

const format=(n:number)=>n.toLocaleString('sv-SE',{maximumFractionDigits:2});
const name=(s:string)=>{try{return decodeURIComponent(s.split(':').at(-1)??s)}catch{return s}};
const measures:Record<Metric,string>={it_hours:'IT-timmar',business_hours:'Verksamhetstimmar',consultant_cost:'Produktkonsulter',other_cost:'Övriga omkostnader'};

export default function ProjectActivityEditor({data,state,projectId,year,metrics,onSaved}:{data:CanonicalDataset;state:GapState;projectId:string;year?:number;metrics:Metric[];onSaved:(state:GapState)=>void}){
 const rows=projectAllocationRows(data).filter(r=>r.scope.axis==='project'&&r.scope.projectId===projectId&&
  (year===undefined||r.year===year)&&metrics.includes(r.metric));
 const decisions=activeProjectActivitySplits(data,state.projectActivitySplits??[]);
 return <section className="panel" aria-label="Projektfördelningar Utveckling och Förvaltning">
  <h4>Utveckling / Förvaltning per projektdel</h4>
  <p>Välj en andel per projektdel, år och mått. Den importerade totalen ändras inte. Saknade fördelningar visas inte som noll.</p>
  {!rows.length?<p>Inga importvärden att fördela för det valda urvalet.</p>:rows.map(row=>{
   if(row.scope.axis!=='project')return null;
   const saved=decisions.find(d=>d.workloadId===row.workloadId);
   return <ProjectActivityEditRow key={row.workloadId+'|'+(saved?.sourceFingerprint??'missing')+'|'+(saved?.developmentPercent??'missing')} row={row} percent={saved?.developmentPercent} state={state} data={data} onSaved={onSaved}/>;
  })}
 </section>;
}

function ProjectActivityEditRow({row,percent,data,state,onSaved}:{row:ReturnType<typeof projectAllocationRows>[number];percent?:number;data:CanonicalDataset;state:GapState;onSaved:(state:GapState)=>void}){
 const [value,setValue]=useState(percent===undefined?'':String(percent));
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const unit=row.metric.endsWith('_hours')?'h':'kr';
 const parsed=Number(value),valid=value.trim()!==''&&Number.isFinite(parsed)&&parsed>=0&&parsed<=100;
 const save=async()=>{
  if(!valid)return;
  setBusy(true);setError('');
  try{
   const latest=await loadGapState();
   const current=(latest.projectActivitySplits??[]).find(x=>x.workloadId===row.workloadId);
   const shown=(state.projectActivitySplits??[]).find(x=>x.workloadId===row.workloadId);
   if(JSON.stringify(current)!==JSON.stringify(shown))throw new Error('Fördelningen har ändrats i en annan flik. Ladda om sidan.');
   const next={...latest,projectActivitySplits:saveProjectActivitySplit(data,latest.projectActivitySplits??[],{workloadId:row.workloadId,developmentPercent:parsed})};
   await saveGapState(next,latest);onSaved(next);
  }catch(e){setError(e instanceof Error?e.message:String(e))}
  finally{setBusy(false)}
 };
 const part=row.scope.axis==='project'?name(row.scope.partId):'';
 return <div className="panel" style={{marginTop:8}} aria-label={'Fördelning '+part+' '+row.metric+' '+row.year}>
  <strong>{part} · {row.year} · {measures[row.metric]}</strong>
  <p>Totalt: {format(row.value)} {unit} · {percent===undefined?'Fördelning saknas':'Sparad: '+format(percent)+' % Utveckling'}</p>
  {percent!==undefined&&<div role="img" aria-label={'Sparad fördelning: Utveckling '+format(percent)+' %, Förvaltning '+format(100-percent)+' %'}
   style={{display:'flex',height:14,width:'100%',borderRadius:8,overflow:'hidden',background:'#e2e8f0'}}>
   <span style={{width:percent+'%',background:'#2563eb'}}/><span style={{width:(100-percent)+'%',background:'#0d9488'}}/>
  </div>}
  {value===''&&<button type="button" className="secondary" onClick={()=>setValue('50')}>Ange fördelning</button>}
  {value!==''&&<label style={{display:'block',marginTop:12}}>Utveckling: {valid?format(parsed)+' %':'Ange 0–100 %'} · Förvaltning: {valid?format(100-parsed)+' %':'–'}
   <input type="range" min="0" max="100" step="1" value={valid?parsed:50} disabled={busy} onChange={e=>setValue(e.target.value)}
    aria-label={'Fördelningsreglage '+part+' '+row.year+' '+row.metric} style={{display:'block',width:'100%'}}/>
  </label>}
  <label>Utveckling (%) <input type="number" min="0" max="100" step="1" value={value} disabled={busy} onChange={e=>setValue(e.target.value)} aria-label={'Utveckling procent '+part+' '+row.year+' '+row.metric}/></label>
  {valid&&<p role="status">Förhandsvisning (ej sparad): Utveckling {format(row.value*parsed/100)} {unit} · Förvaltning {format(row.value*(100-parsed)/100)} {unit}</p>}
  <button type="button" className="secondary" disabled={busy||!valid||percent===parsed} onClick={()=>void save()}>{busy?'Sparar…':'Spara fördelning'}</button>
  {error&&<p role="alert">{error}</p>}
 </div>;
}
