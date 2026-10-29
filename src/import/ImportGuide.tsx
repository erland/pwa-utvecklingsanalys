import {useState} from 'react';
import BudgetCompletionAfterImport from './BudgetCompletionAfterImport';
import DirectImport from './DirectImport';
import SourceManager from './SourceManager';
import type {AnalysisProject} from '../model';

/** The only supported user-facing flow is registered-format direct import. */
export default function ImportGuide({project,onProject,replaceId,setReplaceId,onAnalyze}:{project:AnalysisProject|null;onProject:(p:AnalysisProject)=>void;replaceId:string|null;setReplaceId:(id:string|null)=>void;onAnalyze:()=>void}){
 const [completedImport,setCompletedImport]=useState(0);
 const [allocationSourceId,setAllocationSourceId]=useState<string|null>(null);
 return <>
  <div className="eyebrow">IMPORT · XLSX</div>
  <h1>Importera Excelunderlag</h1>
  <p className="lead">Välj en eller flera Excel-filer. Kända format importeras automatiskt utan manuell mappning eller förhandsgranskning. Filerna behandlas lokalt i webbläsaren.</p>
  <DirectImport project={project} onProject={onProject} replaceId={replaceId} onReplaced={()=>setReplaceId(null)} onImported={()=>setCompletedImport(n=>n+1)}/>
  {project&&<BudgetCompletionAfterImport refreshKey={completedImport} onAnalyze={onAnalyze} selectedSourceId={allocationSourceId} onCloseSource={()=>setAllocationSourceId(null)}/>}
  <SourceManager project={project} onProject={onProject} replaceId={replaceId} setReplaceId={setReplaceId} onEditAllocations={id=>setAllocationSourceId(id)}/>
 </>;
}
