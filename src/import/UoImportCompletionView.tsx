import {useEffect,useState} from 'react';
import {loadCanonical} from '../domain/canonicalStore';
import {loadGapState,saveGapState} from '../gaps/store';
import type {CanonicalDataset} from '../domain/canonical';
import type {GapState} from '../gaps/store';
import {uoAllocationEligibility} from '../allocations/uoAllocationEligibility';
import {activeUoImportCompletions,completionKey,saveUoImportCompletion} from './uoImportCompletions';

const label=(id:string)=>{try{return decodeURIComponent(id.split(':').at(-1)??id)}catch{return id}};
type Values={development:string;maintenance:string};
type Candidate=ReturnType<typeof uoAllocationEligibility>[number];

export default function UoImportCompletionView({refresh}:{refresh:number}){
 const [data,setData]=useState<CanonicalDataset|null>(null);
 const [gaps,setGaps]=useState<GapState>({requirements:[],resolutions:[]});
 const [inputs,setInputs]=useState<Record<string,Values>>({});
 const [expanded,setExpanded]=useState<Record<string,boolean>>({});
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{let live=true;void Promise.all([loadCanonical(),loadGapState()]).then(([d,g])=>{
  if(live){setData(d);setGaps(g);setInputs({});setExpanded({});}
 }).catch(e=>{if(live)setError(String(e))});return()=>{live=false}},[refresh]);
 if(!data)return null;
 const candidates=uoAllocationEligibility(data).filter(x=>x.status==='manual-allowed'&&['it_hours','business_hours','other_cost'].includes(x.metric));
 const current=activeUoImportCompletions(data,gaps.uoImportCompletions??[]);
 const groups=new Map<string,Candidate[]>();
 for(const row of candidates)groups.set(row.uoId,[...(groups.get(row.uoId)??[]),row]);
 const importedPair=(row:Candidate)=>data.records.filter(r=>r.scope.axis==='work'&&r.scope.uoId===row.uoId&&r.metric===row.metric&&r.year===row.year&&r.authority==='original'&&r.workPart==='uo-activity-matrix');
 const valuesFor=(row:Candidate):Values=>{
  const key=completionKey(row),existing=current.find(x=>completionKey(x)===key);
  const imported=importedPair(row);
  return inputs[key]??{development:String(imported.find(r=>r.activity==='development')?.value??existing?.development??''),maintenance:String(imported.find(r=>r.activity==='maintenance')?.value??existing?.maintenance??'')};
 };
 const valid=(v:Values)=>v.development.trim()!==''&&v.maintenance.trim()!==''&&Number.isFinite(Number(v.development))&&Number.isFinite(Number(v.maintenance))&&Number(v.development)>=0&&Number(v.maintenance)>=0&&Number(v.development)+Number(v.maintenance)>0;
 const setPart=(row:Candidate,part:keyof Values,value:string)=>setInputs(old=>({...old,[completionKey(row)]:{...valuesFor(row),[part]:value}}));
 const saveUo=async(uoId:string,rows:Candidate[])=>{
  if(rows.some(row=>!valid(valuesFor(row))))return;
  setBusy(true);setError('');
  try{
   const latest=await loadGapState();
   if(JSON.stringify(latest.uoImportCompletions??[])!==JSON.stringify(gaps.uoImportCompletions??[]))
    throw new Error('Kompletteringarna har ändrats i en annan flik. Ladda om.');
   let uoImportCompletions=latest.uoImportCompletions??[];
   for(const row of rows){
    const values=valuesFor(row);
    uoImportCompletions=saveUoImportCompletion(data,uoImportCompletions,{uoId:row.uoId,year:row.year,metric:row.metric,development:Number(values.development),maintenance:Number(values.maintenance)});
   }
   const keys=new Set(rows.map(completionKey));
   const manualUoSplits=(latest.manualUoSplits??[]).filter(item=>!keys.has(completionKey(item)));
   const next={...latest,uoImportCompletions,manualUoSplits};
   await saveGapState(next);
   setGaps(next);
   setInputs(old=>Object.fromEntries(Object.entries(old).filter(([key])=>!keys.has(key))));
   setExpanded(old=>({...old,[uoId]:false}));
  }catch(e){setError(String(e))}finally{setBusy(false)}
 };
 return <section className="panel" aria-label="Komplettera importuppgifter">
  <h2>2. Komplettera saknade UO-värden</h2>
  <p>Komplettera saknade utvecklings- och förvaltningsvärden per UO. Importerade värden kan inte ändras. Alla kompletteringar för ett UO sparas tillsammans.</p>
  {!groups.size?<p>Inga ofullständiga UO-fördelningar hittades.</p>:[...groups].sort(([a],[b])=>label(a).localeCompare(label(b),'sv')).map(([uoId,rows])=>{
   const complete=rows.every(row=>current.some(x=>completionKey(x)===completionKey(row)));
   const open=expanded[uoId]??!complete;
   const ready=rows.every(row=>valid(valuesFor(row)));
   return <section key={uoId} className="panel" style={{marginTop:8}} aria-label={'UO '+label(uoId)}>
    <button type="button" className="secondary" aria-expanded={open} style={{width:'100%',textAlign:'left'}} onClick={()=>setExpanded(old=>({...old,[uoId]:!open}))}>
     <strong>{label(uoId)} {open?'▾':'›'}</strong>
     <span style={{display:'block'}}>{complete?'Kompletterat · sparat':rows.length+' fördelningar behöver kompletteras'}</span>
    </button>
    {open&&<>
     {rows.sort((a,b)=>a.year-b.year||a.metric.localeCompare(b.metric)).map(row=>{
      const values=valuesFor(row),imported=importedPair(row);
      const dev=imported.some(r=>r.activity==='development'),maint=imported.some(r=>r.activity==='maintenance');
      return <div key={completionKey(row)} className="panel" style={{marginTop:8}}>
       <strong>{row.year} · {row.metric==='it_hours'?'IT-timmar':row.metric==='business_hours'?'Verksamhetstimmar':'Kostnader'}</strong>
       <div className="mapping-grid">
        <label>Utveckling<input type="number" min="0" step="any" aria-label={'Utveckling '+label(uoId)+' '+row.year+' '+row.metric} disabled={busy||dev} value={values.development} onChange={e=>setPart(row,'development',e.target.value)}/></label>
        <label>Förvaltning<input type="number" min="0" step="any" aria-label={'Förvaltning '+label(uoId)+' '+row.year+' '+row.metric} disabled={busy||maint} value={values.maintenance} onChange={e=>setPart(row,'maintenance',e.target.value)}/></label>
       </div>
      </div>;
     })}
     <button className="primary" type="button" disabled={busy||!ready} onClick={()=>void saveUo(uoId,rows)}>Spara UO-värden för {label(uoId)}</button>
    </>}
   </section>;
  })}
  {error&&<p role="alert">{error}</p>}
 </section>;
}
