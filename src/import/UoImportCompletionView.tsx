import {useEffect,useState} from 'react';
import {loadCanonical} from '../domain/canonicalStore';
import {loadGapState,saveGapState} from '../gaps/store';
import type {CanonicalDataset,Metric} from '../domain/canonical';
import type {GapState} from '../gaps/store';
import {uoAllocationEligibility} from '../allocations/uoAllocationEligibility';
import {activeUoImportCompletions,completionKey,saveUoImportCompletion} from './uoImportCompletions';
const label=(id:string)=>{try{return decodeURIComponent(id.split(':').at(-1)??id)}catch{return id}};
export default function UoImportCompletionView({refresh}:{refresh:number}){
 const [data,setData]=useState<CanonicalDataset|null>(null),[gaps,setGaps]=useState<GapState>({requirements:[],resolutions:[]});
 const [inputs,setInputs]=useState<Record<string,{development:string;maintenance:string}>>({});
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{let live=true;void Promise.all([loadCanonical(),loadGapState()]).then(([d,g])=>{if(live){setData(d);setGaps(g)}});return()=>{live=false}},[refresh]);
 if(!data)return null;
 const candidates=uoAllocationEligibility(data).filter(x=>x.status==='manual-allowed'&&['it_hours','business_hours','other_cost'].includes(x.metric));
 const current=activeUoImportCompletions(data,gaps.uoImportCompletions??[]);
 const save=async(row:typeof candidates[number])=>{
  const key=completionKey(row),values=inputs[key];if(!values)return;
  setBusy(true);setError('');
  try{
   const latest=await loadGapState();
   if(JSON.stringify(latest.uoImportCompletions??[])!==JSON.stringify(gaps.uoImportCompletions??[]))throw new Error('Kompletteringarna har ändrats i en annan flik. Ladda om.');
   const uoImportCompletions=saveUoImportCompletion(data,latest.uoImportCompletions??[],{uoId:row.uoId,year:row.year,metric:row.metric,development:Number(values.development),maintenance:Number(values.maintenance)});
   const manualUoSplits=(latest.manualUoSplits??[]).filter(item=>completionKey(item)!==key);
   const next={...latest,uoImportCompletions,manualUoSplits};
   await saveGapState(next);setGaps(next);
  }catch(e){setError(String(e))}finally{setBusy(false)}
 };
 return <section className="panel" aria-label="Komplettera importuppgifter"><h2>2. Komplettera saknade UO-värden</h2>
  <p>Här kompletterar du de faktiska värden för utveckling och förvaltning som saknas i Excelunderlaget. Importerade värden måste bevaras. Underlaget sparas separat från Excel-filen och låses som källa för Fördelningar.</p>
  {candidates.length===0?<p>Inga ofullständiga UO-fördelningar hittades.</p>:candidates.map(row=>{
   const key=completionKey(row),existing=current.find(x=>completionKey(x)===key);
   const imported=data.records.filter(r=>r.scope.axis==='work'&&r.scope.uoId===row.uoId&&r.metric===row.metric&&r.year===row.year&&r.authority==='original'&&r.workPart==='uo-activity-matrix');
   const dev=imported.find(r=>r.activity==='development'),maint=imported.find(r=>r.activity==='maintenance');
   const values=inputs[key]??{development:String(dev?.value??existing?.development??''),maintenance:String(maint?.value??existing?.maintenance??'')};
   const valid=values.development.trim()!==''&&values.maintenance.trim()!==''&&Number.isFinite(Number(values.development))&&Number.isFinite(Number(values.maintenance))&&Number(values.development)>=0&&Number(values.maintenance)>=0&&Number(values.development)+Number(values.maintenance)>0;
   const update=(part:'development'|'maintenance',value:string)=>setInputs(old=>({...old,[key]:{...values,[part]:value}}));
   return <section key={key} className="panel" style={{marginTop:8}}>
    <strong>{label(row.uoId)} · {row.year} · {row.metric==='it_hours'?'IT-timmar':row.metric==='business_hours'?'Verksamhetstimmar':'Kostnader'}</strong>
    <p>{existing?'Kompletterat och sparat':'Saknade värden behöver kompletteras'}</p>
    <div className="mapping-grid">
     <label>Utveckling<input type="number" min="0" step="any" aria-label={'Utveckling '+label(row.uoId)+' '+row.year+' '+row.metric} disabled={busy||Boolean(dev)} value={values.development} onChange={e=>update('development',e.target.value)}/></label>
     <label>Förvaltning<input type="number" min="0" step="any" aria-label={'Förvaltning '+label(row.uoId)+' '+row.year+' '+row.metric} disabled={busy||Boolean(maint)} value={values.maintenance} onChange={e=>update('maintenance',e.target.value)}/></label>
    </div>
    <button type="button" className="primary" disabled={busy||!valid} onClick={()=>void save(row)}>Spara komplettering</button>
   </section>;
  })}
  {error&&<p role="alert">{error}</p>}
 </section>;
}
