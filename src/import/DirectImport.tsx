import {useState} from 'react';
import {importFilesDirectly,type DirectImportResult} from './directImport';
import type {AnalysisProject} from '../model';
import {loadProject} from '../storage';
import {importBatchSummary,presentImportResult} from './importFeedback';

export default function DirectImport({project,onProject,replaceId,onReplaced,onImported}:{project:AnalysisProject|null;onProject:(project:AnalysisProject)=>void;replaceId?:string|null;onReplaced?:()=>void;onImported?:()=>void}){
 const [busy,setBusy]=useState(false);
 const [results,setResults]=useState<DirectImportResult[]>([]);
 const [unexpectedError,setUnexpectedError]=useState('');
 const summary=importBatchSummary(results);
 const run=async(files:FileList|null)=>{
  if(!files?.length)return;
  setBusy(true);setResults([]);setUnexpectedError('');
  try{
   const result=await importFilesDirectly(Array.from(files),async()=>onProject(await loadProject()),replaceId);
   setResults(result);
   if(result.some(item=>item.status==='imported'))onImported?.();
   if(replaceId&&result.some(item=>item.status==='imported'))onReplaced?.();
  }catch(e){setUnexpectedError('Importen kunde inte slutföras: '+(e instanceof Error?e.message:String(e)))}
  finally{setBusy(false);}
 };
 return <section className="panel" aria-label="Automatisk import">
  <h2>Importera Excel-filer automatiskt</h2>
  <p>{replaceId?'Välj en fil för att ersätta den valda källan. Den gamla källan behålls om importen misslyckas.':'Välj en eller flera filer. Kända format identifieras automatiskt och importeras direkt. Okända format och felaktiga filer avvisas utan att ändra befintliga källor.'}</p>
  <label htmlFor="direct-import-files">Välj filer</label>
  <input id="direct-import-files" aria-label="Välj filer för automatisk import" type="file" accept=".xlsx" multiple={!replaceId} disabled={busy||!project} onChange={e=>{void run(e.target.files);e.target.value='';}}/>
  {!project&&<p>Skapa ett projekt innan du importerar filer.</p>}
  {busy&&<p role="status">Importerar filer…</p>}
  {unexpectedError&&<p role="alert">{unexpectedError}</p>}
  {results.length>0&&<div role="status" aria-live="polite" aria-label="Importresultat" className="import-feedback">
   <h3>Importresultat</h3>
   {(results.length>1||summary.rejected>0||summary.warnings>0)&&<p><strong>{summary.imported} importerade · {summary.rejected} inte importerade</strong>{summary.warnings>0?' · '+summary.warnings+' med varningar':''} av {results.length} valda filer.</p>}
   <ul>{results.map((r,i)=>{
    const feedback=presentImportResult(r);
    const clean=r.status==='imported'&&feedback.statusLabel==='Importerad';
    const departmentDetails=r.departmentRows&&r.departmentRows.length>0?<section style={{marginTop:8}} aria-label={'Avdelningskontroll '+r.fileName}>
     <h4>Avdelningskontroll – {r.departmentRows.length} identifierade rader, {r.departmentRows.filter(row=>row.imported>0).length} med timmar, {r.departmentRows.filter(row=>row.imported===0).length} utan importerade timmar</h4>
     <p>Varje UO och Excel-fil kontrolleras separat. Tomma timceller blir inga timmar; noll (0) importeras. Felaktiga koder och timceller visas med radnummer.</p>
     <div style={{overflowX:'auto'}}><table className="canonical-table" aria-label={'Avdelningsrader '+r.fileName}>
      <thead><tr><th>Excelrad</th><th>Kod</th><th>Avdelning</th><th>Årsvärden</th><th>Status / orsak</th></tr></thead>
      <tbody>{r.departmentRows.map(row=><tr key={row.row}><td>{row.row}</td><td>{row.code}</td><th scope="row">{row.name}</th><td>{row.imported} importerade{row.skipped>0?' · '+row.skipped+' överhoppade':''}</td><td>{row.status==='imported'?'Importerad':row.status==='partial'?'Delvis importerad: '+row.reason:row.status==='no-hours'?'Ingen import: '+row.reason:'Överhoppad: '+row.reason}</td></tr>)}</tbody>
     </table></div>
     {r.departmentIssues&&r.departmentIssues.length>0&&<ul>{r.departmentIssues.map((issue,index)=><li key={index}>{issue.cell??'Bladet'}: {issue.message}</li>)}</ul>}
    </section>:null;
    return <li key={i} className="panel" style={{marginTop:8,padding:14}}>
     <strong>{r.fileName}</strong> – <strong>{feedback.statusLabel.toLowerCase()}</strong>
     {clean?<details style={{marginTop:8}}><summary>Visa detaljer</summary><p>{feedback.detail}</p>{departmentDetails}</details>:<><p>{feedback.detail}</p>{departmentDetails}<p><strong>Nästa åtgärd:</strong> {feedback.nextAction}</p></>}
    </li>;
   })}</ul>>
   {summary.rejected>0&&<p>Rätta de avvisade filerna och välj dem igen. Redan importerade filer behöver inte importeras på nytt.</p>}
  </div>}
 </section>;
}
