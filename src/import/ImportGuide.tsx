import {useEffect,useState} from 'react';
import {loadSemantic} from '../domain/semanticStore';
import {reconcileDepartmentDemand,type DepartmentReconciliation} from '../domain/departmentReconciliation';
import DirectImport from './DirectImport';
import UoImportCompletionView from './UoImportCompletionView';
import SourceManager from './SourceManager';
import type {AnalysisProject} from '../model';

/** The only supported user-facing flow is registered-format direct import. */
export default function ImportGuide({project,onProject,replaceId,setReplaceId,onAnalyze,onAllocations}:{project:AnalysisProject|null;onProject:(p:AnalysisProject)=>void;replaceId:string|null;setReplaceId:(id:string|null)=>void;onAnalyze:()=>void;onAllocations:()=>void}){
 const [showSources,setShowSources]=useState(false);
 const [completionRefresh,setCompletionRefresh]=useState(0);
 const [reconciliation,setReconciliation]=useState<DepartmentReconciliation[]>([]);
 useEffect(()=>{let alive=true;void loadSemantic().then(data=>{if(alive)setReconciliation(reconcileDepartmentDemand(data))}).catch(()=>{if(alive)setReconciliation([])});return()=>{alive=false}},[project]);
 return <>
  <div className="eyebrow">IMPORT · XLSX</div>
  <h1>Importera Excelunderlag</h1>
  <p className="lead">Välj en eller flera Excel-filer. Kända format importeras automatiskt utan manuell mappning eller förhandsgranskning. Filerna behandlas lokalt i webbläsaren.</p>
  <section aria-label="Steg 1 Importera"><h2>1. Importera filer</h2><DirectImport project={project} onProject={onProject} replaceId={replaceId} onReplaced={()=>setReplaceId(null)} onImported={()=>setCompletionRefresh(n=>n+1)}/></section>
  {project&&<UoImportCompletionView refresh={completionRefresh}/>}
  {project&&<section className="panel" aria-label="Efter import"><h2>Fortsätt till analys</h2><p>LO-fördelningar beräknas automatiskt utifrån importerade UO-andelar. Du kan justera fördelningarna under Fördelningar.</p><button type="button" className="primary" onClick={onAnalyze}>Gå till analys</button></section>}
  {reconciliation.length>0&&<section className="panel" aria-label="Avstämning av avdelningstimmar" style={{marginTop:18}}>
   <h2>Avstämning av timmar per avdelning</h2>
   <p>Avdelningsbladets timmar jämförs per UO, källa, år och timtyp med budgetens detaljvärden. Differenser är information och påverkar inte import eller budgetvärden.</p>
   <div style={{overflowX:'auto'}}><table className="canonical-table"><thead><tr><th>UO</th><th>År</th><th>Timtyp</th><th>Avdelningar</th><th>Budget</th><th>Differens</th></tr></thead><tbody>
   {reconciliation.map(r=><tr key={[r.datasetId,r.uoId,r.year,r.metric].join(':')}><th scope="row">{decodeURIComponent(r.uoId.slice(3))}</th><td>{r.year}</td><td>{r.metric==='it_hours'?'IT-timmar':'Verksamhetstimmar'}</td><td>{r.departmentHours.toLocaleString('sv-SE')} h</td><td>{r.budgetHours===null?'Saknas':r.budgetHours.toLocaleString('sv-SE')+' h'}</td><td>{r.difference===null?'Ej jämförbart':(r.difference>0?'+':'')+r.difference.toLocaleString('sv-SE')+' h'}</td></tr>)}
   </tbody></table></div>
  </section>}
  <section aria-label="Hantera importerade källor" className="panel" style={{marginTop:18}}><div className="actions"><h2>Källadministration</h2><button type="button" className="secondary" aria-expanded={showSources} onClick={()=>setShowSources(v=>!v)}>{showSources?'Dölj källor':'Visa källor och hantera import'}</button></div><p>Visa importerade filer när du behöver ersätta, ändra eller ta bort en källa.</p>{showSources&&<SourceManager project={project} onProject={p=>{onProject(p);}} replaceId={replaceId} setReplaceId={setReplaceId} onEditAllocations={()=>{setShowSources(false);onAllocations()}}/>}</section>
 </>;
}
