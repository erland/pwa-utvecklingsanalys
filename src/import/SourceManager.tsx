import {useState} from 'react';
import type {AnalysisProject} from '../model';
import {deleteImportedSources} from './sourceManagement';

export default function SourceManager({project,onProject,replaceId,setReplaceId}:{project:AnalysisProject|null;onProject:(p:AnalysisProject)=>void;replaceId:string|null;setReplaceId:(id:string|null)=>void}){
 const [pendingDelete,setPendingDelete]=useState<string|null>(null);
 const [confirmation,setConfirmation]=useState('');
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const remove=async()=>{
  if(!project||confirmation!=='TA BORT'||busy)return;
  setBusy(true);
  try{
   const ids=pendingDelete==='all'?project.datasets.map(d=>d.id):pendingDelete?[pendingDelete]:[];
   const next=await deleteImportedSources(ids);
   onProject(next);setPendingDelete(null);setConfirmation('');setReplaceId(null);
   setMessage(ids.length+' källa/källor och deras observationer har tagits bort. Konfigurationen har bevarats.');
  }catch(e){setMessage('Borttagning misslyckades: '+String(e))}
  finally{setBusy(false)}
 };
 return <>{message&&<p role="status" className="notice">{message}</p>}
 {project&&<section className="panel" style={{marginTop:18}}><h2>Importerade källor</h2><p>Ta bort en godkänd källa eller välj Ersätt för att granska en ny Excel-fil innan de gamla värdena byts ut. Konfiguration och gruppmodeller bevaras.</p>
 {project.datasets.length===0?<p>Inga godkända källor.</p>:<><div style={{overflowX:'auto'}}><table className="analysis-table"><thead><tr><th>Källa</th><th>Importerad</th><th>Åtgärder</th></tr></thead><tbody>{project.datasets.map(d=><tr key={d.id}><td>{d.name}</td><td>{new Date(d.importedAt).toLocaleString('sv-SE')}</td><td><div className="actions"><button className="secondary" disabled={busy} onClick={()=>{setReplaceId(d.id);setPendingDelete(null);setMessage('Välj en ny XLSX-fil ovan för automatisk ersättning. Den gamla källan behålls om importen misslyckas.')}}>Ersätt</button><button className="secondary" disabled={busy} onClick={()=>{setPendingDelete(d.id);setConfirmation('')}}>Ta bort</button></div></td></tr>)}</tbody></table></div><button className="secondary" disabled={busy} onClick={()=>{setPendingDelete('all');setConfirmation('')}}>Töm importerade data</button></>}
 {replaceId&&<p role="status" className="notice">Ersätter: {project.datasets.find(d=>d.id===replaceId)?.name}. Välj en XLSX-fil i den automatiska importen ovan. <button className="secondary" onClick={()=>setReplaceId(null)}>Avbryt ersättning</button></p>}
 {pendingDelete&&<div className="notice" role="group" aria-label="Bekräfta borttagning"><p>{pendingDelete==='all'?'Alla importerade källor och deras analysvärden tas bort.':'Källan och dess importerade analysvärden tas bort.'} Åtgärden kan inte ångras utan projektbackup. Skriv TA BORT för att bekräfta.</p><label>Bekräftelsetext <input aria-label="Bekräftelsetext" value={confirmation} onChange={e=>setConfirmation(e.target.value)}/></label><div className="actions"><button className="primary" disabled={busy||confirmation!=='TA BORT'} onClick={()=>{void remove()}}>Bekräfta borttagning</button><button className="secondary" onClick={()=>{setPendingDelete(null);setConfirmation('')}}>Avbryt</button></div></div>}</section>}

 </>;
}
