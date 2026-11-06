import {useState} from 'react';
import type {CanonicalDataset,Metric} from '../domain/canonical';
import type {GapState} from '../gaps/store';
import {loadGapState,saveGapState} from '../gaps/store';
import {activeProjectImportCompletions,projectCompletionRows,saveProjectImportCompletion} from '../allocations/projectActivityAllocation';

const label=(id:string)=>{try{return decodeURIComponent(id.slice('project:'.length))}catch{return id}};
const metricName:Record<Metric,string>={it_hours:'IT-timmar',business_hours:'Verksamhetstimmar',other_cost:'Omkostnader (Mnkr)',consultant_cost:'Produktkonsulter'};
export default function ProjectImportCompletionView({data,state,onSaved}:{data:CanonicalDataset;state:GapState;onSaved:(next:GapState)=>void}){
 const [inputs,setInputs]=useState<Record<string,{development:string;maintenance:string}>>({});
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 const active=activeProjectImportCompletions(data,state.projectImportCompletions??[]);
 const rows=projectCompletionRows(data).filter(r=>r.development===undefined||r.maintenance===undefined||r.developmentAssumed||r.maintenanceAssumed||active.some(c=>c.projectId===r.projectId&&c.year===r.year&&c.metric===r.metric));
 const rowKey=(r:typeof rows[number])=>JSON.stringify([r.projectId,r.year,r.metric]);
 const saved=(r:typeof rows[number])=>active.find(c=>c.projectId===r.projectId&&c.year===r.year&&c.metric===r.metric);
 const source=(r:typeof rows[number])=>({development:String(saved(r)?.development??r.development??''),maintenance:String(saved(r)?.maintenance??r.maintenance??'')});
 const display=(r:typeof rows[number],v:{development:string;maintenance:string})=>r.metric==='other_cost'?{development:v.development===''?'':String(Number(v.development)/1e6),maintenance:v.maintenance===''?'':String(Number(v.maintenance)/1e6)}:v;
 const values=(r:typeof rows[number])=>inputs[rowKey(r)]??display(r,source(r));
 const valid=(v:{development:string;maintenance:string})=>v.development.trim()!==''&&v.maintenance.trim()!==''&&Number.isFinite(Number(v.development))&&Number.isFinite(Number(v.maintenance))&&Number(v.development)>=0&&Number(v.maintenance)>=0&&Number(v.development)+Number(v.maintenance)>0;
 const save=async(r:typeof rows[number])=>{
  const v=values(r);if(!valid(v))return;
  const factor=r.metric==='other_cost'?1e6:1;
  setBusy(true);setError('');
  try{
   const latest=await loadGapState();
   if(JSON.stringify(latest.projectImportCompletions??[])!==JSON.stringify(state.projectImportCompletions??[]))throw Error('Projektkompletteringen ändrades i en annan flik. Ladda om.');
   const next={...latest,projectImportCompletions:saveProjectImportCompletion(data,latest.projectImportCompletions??[],{
    projectId:r.projectId,year:r.year,metric:r.metric,development:Number(v.development)*factor,maintenance:Number(v.maintenance)*factor})};
   await saveGapState(next,latest);
   onSaved(next);setInputs(old=>Object.fromEntries(Object.entries(old).filter(([k])=>k!==rowKey(r))));
  }catch(e){setError(String(e))}finally{setBusy(false)}
 };
 if(!rows.length)return null;
 return <section aria-label="Komplettera projektvärden" className="panel" style={{marginTop:12}}>
  <h2>3. Komplettera saknade projektvärden</h2>
  <p>Projektets utvecklings- och förvaltningsandel används automatiskt för delprojekten. Importerade värden är låsta, medan tomma eller antagna nollvärden kan ändras. Manuella delprojektfördelningar behålls.</p>
  {rows.map(r=>{const v=values(r);return <div className="panel" key={rowKey(r)} style={{marginTop:8}}>
   <strong>{label(r.projectId)} · {r.year} · {metricName[r.metric]}</strong>
   <div className="mapping-grid">{(['development','maintenance'] as const).map(activity=><label key={activity}>
    {activity==='development'?'Utveckling':'Förvaltning'}
    <input type="number" min="0" step="any" aria-label={'Projekt '+label(r.projectId)+' '+r.year+' '+r.metric+' '+activity}
     disabled={busy||(r[activity]!==undefined&&!r[activity==='development'?'developmentAssumed':'maintenanceAssumed'])}
     value={v[activity]} onChange={e=>setInputs(old=>({...old,[rowKey(r)]:{...v,[activity]:e.target.value}}))}/>
   </label>)}</div>
   <button type="button" className="primary" disabled={busy||!valid(v)} onClick={()=>void save(r)}>Spara projektvärden</button>
  </div>})}
  {error&&<p role="alert">{error}</p>}
 </section>;
}
