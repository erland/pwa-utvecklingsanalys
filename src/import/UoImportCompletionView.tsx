import {useEffect,useState} from 'react';
import {loadCanonical} from '../domain/canonicalStore';
import {loadGapState,saveGapState} from '../gaps/store';
import type {CanonicalDataset} from '../domain/canonical';
import type {GapState} from '../gaps/store';
import {completionKey} from './uoImportCompletions';
import {completionCandidates,groupCompletionRows,importedCompletionParts,completionValues,
 validCompletionValues,buildUoCompletionState,activeCompletionRows,
 type CompletionRow,type CompletionValues,completionDisplayValues,completionStoredValues} from './uoImportCompletionForm';

const label=(id:string)=>{try{return decodeURIComponent(id.split(':').at(-1)??id)}catch{return id}};

export default function UoImportCompletionView({refresh}:{refresh:number}){
 const [data,setData]=useState<CanonicalDataset|null>(null);
 const [gaps,setGaps]=useState<GapState>({requirements:[],resolutions:[]});
 const [inputs,setInputs]=useState<Record<string,CompletionValues>>({});
 const [expanded,setExpanded]=useState<Record<string,boolean>>({});
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{let live=true;void Promise.all([loadCanonical(),loadGapState()]).then(([d,g])=>{
  if(live){setData(d);setGaps(g);setInputs({});setExpanded({});}
 }).catch(e=>{if(live)setError(String(e))});return()=>{live=false}},[refresh]);
 if(!data)return null;
 const candidates=completionCandidates(data);
 const current=activeCompletionRows(data,gaps);
 const assumed=candidates.filter(row=>importedCompletionParts(data,row).some(p=>p.assumedZero));
 const pending=candidates.filter(row=>!assumed.includes(row));
 const groups=groupCompletionRows(pending);
 const optionalGroups=groupCompletionRows(assumed);
 const importedPair=(row:CompletionRow)=>importedCompletionParts(data,row);
 const shownValues=(row:CompletionRow):CompletionValues=>inputs[completionKey(row)]??completionDisplayValues(row.metric,completionValues(data,row,current,{}));
 const valuesFor=(row:CompletionRow):CompletionValues=>completionStoredValues(row.metric,shownValues(row));
 const setPart=(row:CompletionRow,part:keyof CompletionValues,value:string)=>setInputs(old=>({...old,[completionKey(row)]:{...shownValues(row),[part]:value}}));
 const saveUo=async(uoId:string,rows:CompletionRow[])=>{
  if(rows.some(row=>!validCompletionValues(valuesFor(row))))return;
  setBusy(true);setError('');
  try{
   const latest=await loadGapState();
   if(JSON.stringify(latest.uoImportCompletions??[])!==JSON.stringify(gaps.uoImportCompletions??[]))
    throw new Error('Kompletteringarna har ändrats i en annan flik. Ladda om.');
   const next=buildUoCompletionState(data,latest,rows,valuesFor);
   const keys=new Set(rows.map(completionKey));
   // Verify the entire state inside the same IndexedDB readwrite transaction.
   // A different editor may save between loadGapState() and this commit.
   await saveGapState(next,latest);
   setGaps(next);
   setInputs(old=>Object.fromEntries(Object.entries(old).filter(([key])=>!keys.has(key))));
   setExpanded(old=>({...old,[uoId]:false}));
  }catch(e){setError(e instanceof Error&&e.message==='STALE_GAP_STATE'?
   'Kompletteringarna har ändrats i en annan flik. Ladda om innan du sparar.':String(e))}finally{setBusy(false)}
 };
 return <section className="panel" aria-label="Komplettera importuppgifter">
  <h2>2. Komplettera saknade UO-värden</h2>
  <p>En tom utvecklings- eller förvaltningscell antas vara 0 när motsatt sida har ett positivt värde. LO fördelas då automatiskt. Antagna nollor kan ändras nedan, medan ifyllda källvärden är låsta.</p>
  {!groups.size?<p>Inga UO-fördelningar kräver komplettering.</p>:[...groups].sort(([a],[b])=>label(a).localeCompare(label(b),'sv')).map(([uoId,rows])=>{
   const complete=rows.every(row=>current.some(x=>completionKey(x)===completionKey(row)));
   const open=expanded[uoId]??!complete;
   const ready=rows.every(row=>validCompletionValues(valuesFor(row)));
   return <section key={uoId} className="panel" style={{marginTop:8}} aria-label={'UO '+label(uoId)}>
    <button type="button" className="secondary" aria-expanded={open} style={{width:'100%',textAlign:'left'}} onClick={()=>setExpanded(old=>({...old,[uoId]:!open}))}>
     <strong>{label(uoId)} {open?'▾':'›'}</strong>
     <span style={{display:'block'}}>{complete?'Kompletterat · sparat':rows.length+' fördelningar behöver kompletteras'}</span>
    </button>
    {open&&<>
     {rows.sort((a,b)=>a.year-b.year||a.metric.localeCompare(b.metric)).map(row=>{
      const values=shownValues(row),imported=importedPair(row);
      const dev=imported.some(r=>r.activity==='development'&&!r.assumedZero),maint=imported.some(r=>r.activity==='maintenance'&&!r.assumedZero);
      return <div key={completionKey(row)} className="panel" style={{marginTop:8}}>
       <strong>{row.year} · {row.metric==='it_hours'?'IT-timmar':row.metric==='business_hours'?'Verksamhetstimmar':'Omkostnader (Mnkr)'}</strong>
       <div className="mapping-grid">
        <label>Utveckling {row.metric==='other_cost'?'(Mnkr)':'(h)'}<input type="number" min="0" step="any" aria-label={'Utveckling '+label(uoId)+' '+row.year+' '+row.metric} disabled={busy||dev} value={values.development} onChange={e=>setPart(row,'development',e.target.value)}/></label>
        <label>Förvaltning {row.metric==='other_cost'?'(Mnkr)':'(h)'}<input type="number" min="0" step="any" aria-label={'Förvaltning '+label(uoId)+' '+row.year+' '+row.metric} disabled={busy||maint} value={values.maintenance} onChange={e=>setPart(row,'maintenance',e.target.value)}/></label>
       </div>
      </div>;
     })}
     <button className="primary" type="button" disabled={busy||!ready} onClick={()=>void saveUo(uoId,rows)}>Spara UO-värden för {label(uoId)}</button>
    </>}
   </section>;
  })}
  {optionalGroups.size>0&&<details style={{marginTop:12}} aria-label="Ändra antagna nollvärden"><summary>Ändra automatiskt antagna nollvärden ({assumed.length})</summary>
   <p>De tomma cellerna har fått värdet 0 som förslag. Ändra dem här vid behov; andra importerade värden kan inte skrivas över.</p>
   {[...optionalGroups].map(([uoId,rows])=><section key={uoId} className="panel" aria-label={'Antagna nollor '+label(uoId)}>
    <h3>{label(uoId)}</h3>
    {rows.map(row=>{
     const values=shownValues(row),imported=importedPair(row);
     const dev=imported.some(r=>r.activity==='development'&&!r.assumedZero);
     const maint=imported.some(r=>r.activity==='maintenance'&&!r.assumedZero);
     return <div key={completionKey(row)}><strong>{row.year} · {row.metric==='it_hours'?'IT-timmar':row.metric==='business_hours'?'Verksamhetstimmar':'Omkostnader (Mnkr)'}</strong>
      <div className="mapping-grid">
       <label>Utveckling<input type="number" min="0" step="any" disabled={busy||dev} value={values.development} onChange={e=>setPart(row,'development',e.target.value)}/></label>
       <label>Förvaltning<input type="number" min="0" step="any" disabled={busy||maint} value={values.maintenance} onChange={e=>setPart(row,'maintenance',e.target.value)}/></label>
      </div>
     </div>;
    })}
    <button className="primary" type="button" disabled={busy||rows.some(row=>!validCompletionValues(valuesFor(row)))} onClick={()=>void saveUo(uoId,rows)}>Spara ändring för {label(uoId)}</button>
   </section>)}
  </details>}
  {error&&<p role="alert">{error}</p>}
 </section>;
}
