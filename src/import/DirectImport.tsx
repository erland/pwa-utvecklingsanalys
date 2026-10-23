import {useState} from 'react';
import {importFilesDirectly,type DirectImportResult} from './directImport';
import type {AnalysisProject} from '../model';
import {loadProject} from '../storage';

export default function DirectImport({project,onProject}:{project:AnalysisProject|null;onProject:(project:AnalysisProject)=>void}){
 const [busy,setBusy]=useState(false);
 const [results,setResults]=useState<DirectImportResult[]>([]);
 const run=async(files:FileList|null)=>{
  if(!files?.length)return;
  setBusy(true);
  try{
   setResults(await importFilesDirectly(Array.from(files),async()=>onProject(await loadProject())));
  }finally{setBusy(false);}
 };
 return <section className="panel" aria-label="Automatisk import">
  <h2>Importera Excel-filer automatiskt</h2>
  <p>Välj en eller flera filer. Kända format identifieras automatiskt och importeras direkt. Okända format och felaktiga filer avvisas utan att ändra befintliga källor.</p>
  <label htmlFor="direct-import-files">Välj filer</label>
  <input id="direct-import-files" aria-label="Välj filer för automatisk import" type="file" accept=".xlsx" multiple disabled={busy||!project} onChange={e=>{void run(e.target.files);e.target.value='';}}/>
  {!project&&<p>Skapa ett projekt innan du importerar filer.</p>}
  {busy&&<p role="status">Importerar filer…</p>}
  {results.length>0&&<div role="status" aria-live="polite"><h3>Importresultat</h3><ul>{results.map((r,i)=><li key={i}><strong>{r.fileName}</strong>: {r.status==='imported'?r.facts+' detaljvärden importerade ('+r.format+')':'Inte importerad – '+r.message}</li>)}</ul></div>}
 </section>;
}
