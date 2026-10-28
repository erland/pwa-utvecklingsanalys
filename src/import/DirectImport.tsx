import {useState} from 'react';
import {importFilesDirectly,type DirectImportResult} from './directImport';
import type {AnalysisProject} from '../model';
import {loadProject} from '../storage';

export default function DirectImport({project,onProject,replaceId,onReplaced,onImported}:{project:AnalysisProject|null;onProject:(project:AnalysisProject)=>void;replaceId?:string|null;onReplaced?:()=>void;onImported?:()=>void}){
 const [busy,setBusy]=useState(false);
 const [results,setResults]=useState<DirectImportResult[]>([]);
 const run=async(files:FileList|null)=>{
  if(!files?.length)return;
  setBusy(true);
  try{
   const result=await importFilesDirectly(Array.from(files),async()=>onProject(await loadProject()),replaceId);
   setResults(result);
   if(result.some(item=>item.status==='imported'))onImported?.();
   if(replaceId&&result.some(item=>item.status==='imported'))onReplaced?.();
  }finally{setBusy(false);}
 };
 return <section className="panel" aria-label="Automatisk import">
  <h2>Importera Excel-filer automatiskt</h2>
  <p>{replaceId?'Välj en fil för att ersätta den valda källan. Den gamla källan behålls om importen misslyckas.':'Välj en eller flera filer. Kända format identifieras automatiskt och importeras direkt. Okända format och felaktiga filer avvisas utan att ändra befintliga källor.'}</p>
  <label htmlFor="direct-import-files">Välj filer</label>
  <input id="direct-import-files" aria-label="Välj filer för automatisk import" type="file" accept=".xlsx" multiple={!replaceId} disabled={busy||!project} onChange={e=>{void run(e.target.files);e.target.value='';}}/>
  {!project&&<p>Skapa ett projekt innan du importerar filer.</p>}
  {busy&&<p role="status">Importerar filer…</p>}
  {results.length>0&&<div role="status" aria-live="polite"><h3>Importresultat</h3><ul>{results.map((r,i)=><li key={i}><strong>{r.fileName}</strong>: {r.status==='imported'?r.facts+' detaljvärden '+r.message.toLowerCase()+' ('+r.format+')':'Inte importerad – '+r.message}</li>)}</ul></div>}
 </section>;
}
