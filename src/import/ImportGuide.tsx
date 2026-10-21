import {useEffect,useState} from 'react';
import {canApprove,deleteDraft,listDrafts,readDraft,storeDraft,type Draft} from './drafts';
import type {AnalysisProject} from '../model';
import {saveProject} from '../storage';

export default function ImportGuide({project,onProject}:{project:AnalysisProject|null;onProject:(p:AnalysisProject)=>void}){
 const[drafts,setDrafts]=useState<Draft[]>([]),[selected,setSelected]=useState<string|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>{void listDrafts().then(setDrafts).catch(()=>setMessage('Kunde inte läsa sparade utkast.'))},[]);
 const refresh=async()=>setDrafts(await listDrafts());
 const files=async(files:FileList|null)=>{if(!files)return;setBusy(true);setMessage('');const errors:string[]=[];for(const f of Array.from(files)){try{const draft=await readDraft(f);setSelected(draft.id);}catch(e){errors.push(f.name+': '+(e instanceof Error?e.message:'Okänt fel'));}}await refresh();setBusy(false);if(errors.length)setMessage(errors.join(' • '));};
 const active=drafts.find(d=>d.id===selected)??drafts[0];
 const rename=async(value:string)=>{if(!active)return;await storeDraft({...active,uoName:value,updatedAt:new Date().toISOString()});await refresh();};
 const discard=async(id:string)=>{await deleteDraft(id);if(selected===id)setSelected(null);await refresh();};
 const approve=async()=>{if(!active||!project||!canApprove(active))return;setBusy(true);try{
  const datasets=project.datasets.filter(x=>x.id!==active.id);
  datasets.push({id:active.id,name:active.uoName.trim(),planningYear:2027,importedAt:new Date().toISOString(),source:'excel'});
  const next={...project,datasets};await saveProject(next);onProject(next);
  await storeDraft({...active,status:'ready',updatedAt:new Date().toISOString()});await refresh();setMessage('Importen godkänd. Källuppgifter finns kvar lokalt och kan användas i kommande analyssteg.');
 }catch{setMessage('Kunde inte spara importen. Utkastet finns kvar för nytt försök.');}finally{setBusy(false);}};
 return <><div className="eyebrow">IMPORT · XLSX</div><h1>Importera och granska underlag</h1>
 <p className="lead">Välj flera filer och granska dem en i taget. Utkast sparas lokalt, så du kan återuppta arbetet efter omladdning. Filer lämnar inte webbläsaren.</p>
 <section className="panel"><label htmlFor="import-files">Välj Excel-filer</label><input id="import-files" type="file" accept=".xlsx" multiple disabled={busy} onChange={e=>{void files(e.target.files);e.target.value='';}}/><p className="notice">Nuvarande mallprofil: UO-budget 2027–2030. Andra malltyper rapporteras som ej igenkända i stället för att tolkas på chans.</p></section>
 {message&&<p role="status" className="notice">{message}</p>}
 {drafts.length>0&&<div className="analysis-layout" style={{marginTop:20}}><section className="panel filters"><h2>Importerade utkast</h2>{drafts.map(d=><button key={d.id} className={d.id===active?.id?'primary':'secondary'} onClick={()=>setSelected(d.id)}>{d.fileName} ({d.status==='ready'?'Godkänd':'Granska'})</button>)}</section>
 {active&&<section className="panel"><h2>Granska: {active.fileName}</h2><p>Profil: {active.result.profile}</p><label htmlFor="import-uo-name">Utvecklingsområde</label><input id="import-uo-name" value={active.uoName} onChange={e=>{void rename(e.target.value);}}/>
 <p>{active.result.facts.length} detaljvärden identifierade · {active.result.excludedSheets.length} blad utanför profilen</p>
 <h2>Kontroller</h2>{active.result.issues.length===0?<p>Inga avvikelser upptäckta av nuvarande profil.</p>:<ul>{active.result.issues.map((i,n)=><li key={n}>{i.severity==='error'?'Fel':'Varning'}: {i.message} {i.cell?('('+i.cell+')'):''}</li>)}</ul>}
 <h2>Förhandsgranskning (upp till 15 värden)</h2><div style={{overflowX:'auto'}}><table style={{width:'100%',textAlign:'left'}}><thead><tr><th>LO</th><th>Mått</th><th>År</th><th>Värde</th><th>Källa</th></tr></thead><tbody>{active.result.facts.slice(0,15).map((fact,i)=><tr key={i}><td>{fact.area}</td><td>{fact.measure}</td><td>{fact.period.year}</td><td>{fact.value} {fact.unit}</td><td>{fact.source.sheet}!{fact.source.cell}</td></tr>)}</tbody></table></div>
 <div className="actions"><button className="primary" disabled={busy||!canApprove(active)||!project} onClick={()=>{void approve()}}>Godkänn import</button><button className="secondary" disabled={busy} onClick={()=>{void discard(active.id)}}>Ta bort utkast</button></div>
 {active.status==='ready'&&<p className="notice">Tidigare godkänd. Ändringar behöver godkännas igen för att uppdatera projektet.</p>}
 </section>}</div>}
 </>;
}
