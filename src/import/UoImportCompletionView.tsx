import {useEffect,useState} from 'react';
import {loadCanonical} from '../domain/canonicalStore';
import {loadGapState,saveGapState} from '../gaps/store';
import type {CanonicalDataset} from '../domain/canonical';
import type {GapState} from '../gaps/store';
import {uoAllocationEligibility} from '../allocations/uoAllocationEligibility';
import {activeUoImportCompletions,completionKey,saveUoImportCompletion} from './uoImportCompletions';

const label=(id:string)=>{try{return decodeURIComponent(id.split(':').at(-1)??id)}catch{return id}};
const metricLabel=(metric:string)=>metric==='it_hours'?'IT-timmar':metric==='business_hours'?'Verksamhetstimmar':'Kostnader';
type CompletionRow=ReturnType<typeof uoAllocationEligibility>[number];
type Values={development:string;maintenance:string};
export function groupUoCompletions(rows:CompletionRow[]):Map<string,CompletionRow[]>{
 const groups=new Map<string,CompletionRow[]>();
 for(const row of rows)groups.set(row.uoId,[...(groups.get(row.uoId)??[]),row]);
 return new Map([...groups].sort(([a],[b])=>label(a).localeCompare(label(b),'sv')));
}
export default function UoImportCompletionView({refresh}:{refresh:number}){
 const [data,setData]=useState<CanonicalDataset|null>(null),[gaps,setGaps]=useState<GapState>({requirements:[],resolutions:[]});
 const [inputs,setInputs]=useState<Record<string,Values>>({});
 const [expanded,setExpanded]=useState<Record<string,boolean>>({});
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{let live=true;void Promise.all([loadCanonical(),loadGapState()]).then(([d,g])=>{if(live){setData(d);setGaps(g);setInputs({});setExpanded({});setError('')}}).catch(e=>{if(live)setError(String(e))});return()=>{live=false}},[refresh]);
 if(!data)return null;
 const candidates=uoAllocationEligibility(data).filter(x=>x.status==='manual-allowed'&&['it_hours','business_hours','other_cost'].includes(x.metric));
 const grouped=groupUoCompletions(candidates);
 const current=activeUoImportCompletions(data,gaps.uoImportCompletions??[]);
 const stored=(row:CompletionRow)=>current.find(x=>completionKey(x)===completionKey(row));
 const imported=(row:CompletionRow)=>data.records.filter(r=>r.scope.axis==='work'&&r.scope.uoId===row.uoId&&r.metric===row.metric&&r.year===row.year&&r.authority==='original'&&r.workPart==='uo-activity-matrix');
 const valuesFor=(row:CompletionRow):Values=>{
  const original=imported(row),saved=stored(row);
  return inputs[completionKey(row)]??{
   development:String(original.find(r=>r.activity==='development')?.value??saved?.development??''),
   maintenance:String(original.find(r=>r.activity==='maintenance')?.value??saved?.maintenance??'')
  };
 };
 const valid=(v:Values)=>v.development.trim()!==''&&v.maintenance.trim()!==''&&
  Number.isFinite(Number(v.development))&&Number.isFinite(Number(v.maintenance))&&
  Number(v.development)>=0&&Number(v.maintenance)>=0&&Number(v.development)+Number(v.maintenance)>0;
 const update=(row:CompletionRow,part:keyof Values,value:string)=>{
  const key=completionKey(row),old=valuesFor(row);
  setInputs(s=>({...s,[key]:{...old,[part]:value}}));
 };
 const saveUo=async(uoId:string,rows:CompletionRow[])=>{
  setBusy(true);setError('');
  try{
   const latest=await loadGapState();
   if(JSON.stringify(latest.uoImportCompletions??[])!==JSON.stringify(gaps.uoImportCompletions??[]))throw new Error('Kompletteringarna har ändrats i en annan flik. Ladda om.');
   // Validate all fields before a single state write; never partially save an UO.
   if(rows.some(row=>!valid(valuesFor(row))))throw new Error('Fyll i giltiga värden för samtliga saknade uppgifter inom UO innan du sparar.');
   let completions=latest.uoImportCompletions??[];
   let manualUoSplits=latest.manualUoSplits??[];
   for(const row of rows){
    const values=valuesFor(row),key=completionKey(row);
    completions=saveUoImportCompletion(data,completions,{uoId:row.uoId,year:row.year,metric:row.metric,development:Number(values.development),maintenance:Number(values.maintenance)});
    manualUoSplits=manualUoSplits.filter(item=>completionKey(item)!==key);
   }
   const next={...latest,uoImportCompletions:completions,manualUoSplits};
   await saveGapState(next);setGaps(next);
   setInputs(old=>Object.fromEntries(Object.entries(old).filter(([key])=>!rows.some(row=>completionKey(row)===key))));
   setExpanded(old=>({...old,[uoId]:false}));
  }catch(e){setError(String(e))}finally{setBusy(false)}
 };
 return <section className="panel" aria-label="Komplettera importuppgifter"><h2>2. Komplettera saknade UO-värden</h2>
  <p>Komplettera saknade värden för utveckling och förvaltning per UO. Redan importerade värden är låsta. Alla uppgifter för ett UO sparas tillsammans, separat från Excel-filen.</p>
  {grouped.size===0?<p>Inga ofullständiga UO-fördelningar hittades.</p>:[...grouped].map(([uoId,rows])=>{
   const complete=rows.every(row=>Boolean(stored(row)));
   const open=expanded[uoId]??!complete;
   return <section key={uoId} className="panel" style={{marginTop:8}} aria-label={'UO '+label(uoId)}>
    <button type="button" className="secondary" style={{width:'100%',textAlign:'left'}} aria-expanded={open} onClick={()=>setExpanded(old=>({...old,[uoId]:!open}))}>
     <strong>{label(uoId)} {open?'▾':'›'}</strong> <small>{complete?'Kompletterad · sparad':rows.filter(row=>!stored(row)).length+' uppgifter återstår'}</small>
    </button>
    {open&&<>
     {rows.map(row=>{
      const key=completionKey(row),original=imported(row);
      const development=original.find(r=>r.activity==='development'),maintenance=original.find(r=>r.activity==='maintenance');
      const values=valuesFor(row);
      return <div key={key} style={{marginTop:12}}>
       <strong>{row.year} · {metricLabel(row.metric)}</strong>
       <div className="mapping-grid">
        <label>Utveckling<input type="number" min="0" step="any" aria-label={'Utveckling '+label(uoId)+' '+row.year+' '+row.metric} disabled={busy||Boolean(development)} value={values.development} onChange={e=>update(row,'development',e.target.value)}/></label>
        <label>Förvaltning<input type="number" min="0" step="any" aria-label={'Förvaltning '+label(uoId)+' '+row.year+' '+row.metric} disabled={busy||Boolean(maintenance)} value={values.maintenance} onChange={e=>update(row,'maintenance',e.target.value)}/></label>
       </div>
      </div>;
     })}
     <button type="button" className="primary" disabled={busy||rows.some(row=>!valid(valuesFor(row)))} onClick={()=>void saveUo(uoId,rows)}>Spara UO-komplettering</button>
    </>}
   </section>;
  })}
  {error&&<p role="alert">{error}</p>}
 </section>;
}
