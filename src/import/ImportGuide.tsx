import {useState} from 'react';
import BudgetCompletionAfterImport from './BudgetCompletionAfterImport';
import DirectImport from './DirectImport';
import SourceManager from './SourceManager';
import type {AnalysisProject} from '../model';

/** The only supported user-facing flow is registered-format direct import. */
export default function ImportGuide({project,onProject,replaceId,setReplaceId,onAnalyze}:{project:AnalysisProject|null;onProject:(p:AnalysisProject)=>void;replaceId:string|null;setReplaceId:(id:string|null)=>void;onAnalyze:()=>void}){
 const [completedImport,setCompletedImport]=useState(0);
 const [allocationSourceId,setAllocationSourceId]=useState<string|null>(null);
 const [showSources,setShowSources]=useState(false);
 return <>
  <div className="eyebrow">IMPORT · XLSX</div>
  <h1>Importera Excelunderlag</h1>
  <p className="lead">Välj en eller flera Excel-filer. Kända format importeras automatiskt utan manuell mappning eller förhandsgranskning. Filerna behandlas lokalt i webbläsaren.</p>
  <section aria-label="Steg 1 Importera"><h2>1. Importera filer</h2><DirectImport project={project} onProject={onProject} replaceId={replaceId} onReplaced={()=>setReplaceId(null)} onImported={()=>setCompletedImport(n=>n+1)}/></section>
  {project&&<section aria-label="Steg 2 Komplettera"><h2>2. Komplettera och godkänn</h2><p>Granska eventuella fördelningar som behöver godkännas efter importen. När underlaget är klart kan du öppna Analys.</p><BudgetCompletionAfterImport refreshKey={completedImport} onAnalyze={onAnalyze} selectedSourceId={allocationSourceId} onCloseSource={()=>setAllocationSourceId(null)}/></section>}
  <section aria-label="Hantera importerade källor" className="panel" style={{marginTop:18}}><div className="actions"><h2>Källadministration</h2><button type="button" className="secondary" aria-expanded={showSources} onClick={()=>setShowSources(v=>!v)}>{showSources?'Dölj källor':'Visa källor och hantera import'}</button></div><p>Visa importerade filer när du behöver ersätta, ändra eller ta bort en källa.</p>{showSources&&<SourceManager project={project} onProject={p=>{onProject(p);setCompletedImport(n=>n+1);if(allocationSourceId&&!p.datasets.some(d=>d.id===allocationSourceId))setAllocationSourceId(null)}} replaceId={replaceId} setReplaceId={setReplaceId} onEditAllocations={id=>{setAllocationSourceId(id);setShowSources(false)}}/>}</section>
 </>;
}
