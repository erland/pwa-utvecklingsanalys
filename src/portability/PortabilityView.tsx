import {gzipBackup,readBackupFile} from './compression';
import {useState} from 'react';
import {loadProject} from '../storage';
import type {ProjectBackup} from './format';
import {captureProject,restoreProject} from './store';
import {exportFactsCsv,exportFactsXlsx,backupToJson,validateBackup} from './format';
function download(name:string,data:string,mime:string){
 const blob=new Blob([data],{type:mime});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export default function PortabilityView(){
 const [pending,setPending]=useState<ProjectBackup|null>(null),[info,setInfo]=useState(''),[busy,setBusy]=useState(false);
 const [currentProject,setCurrentProject]=useState<{name:string;sources:number}|null>(null);
 const [restored,setRestored]=useState(false);
 const create=async(kind:'backup'|'gzip'|'csv'|'xlsx')=>{setBusy(true);try{const b=await captureProject();if(kind==='backup')download('utvecklingsanalys-projekt-v2.json',backupToJson(b),'application/json');else if(kind==='gzip'){const blob=await gzipBackup(backupToJson(b));const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='utvecklingsanalys-projekt-v2.json.gz';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}else if(kind==='csv')download('utvecklingsanalys-observationer.csv',exportFactsCsv(b.semantic),'text/csv;charset=utf-8');else {const buffer=await exportFactsXlsx(b.semantic);const blob=new Blob([buffer],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='utvecklingsanalys-observationer.xlsx';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}setInfo('Export skapad. Förvara backupen säkert.')}catch(e){setInfo('Export misslyckades: '+String(e))}finally{setBusy(false)}};
 const inspect=async(file?:File)=>{setPending(null);setCurrentProject(null);setRestored(false);if(!file)return;setBusy(true);try{const parsed=validateBackup(await readBackupFile(file));const current=await loadProject();setPending(parsed);setCurrentProject({name:current.name,sources:current.datasets.length});setInfo('Validerad backup: '+parsed.project.name+', '+parsed.semantic.observations.length+' observationer.')}catch(e){setInfo('Filen avvisades eller nuvarande projekt kunde inte läsas: '+String(e))}finally{setBusy(false)}};
 const restore=async()=>{if(!pending||busy)return;setBusy(true);setRestored(false);try{await restoreProject(pending);setInfo('Projekt återställt. Ladda om appen för att visa det återställda projektet.');setPending(null);setCurrentProject(null);setRestored(true)}catch(e){setInfo('Återställning misslyckades. Kontrollera att projektets data är intakta innan du försöker igen: '+String(e))}finally{setBusy(false)}};
 return <section className="panel"><h2>Projektbackup och dataexport</h2><p>Spara projektinformation, observationer, planeringsscenarier och konfiguration i en versionsmärkt JSON-backup. Sparade Excelarbetsböcker i importutkast och konfigurationens revisionshistorik ingår. Original som inte längre finns sparade lokalt kan inte återskapas.</p>
 <div className="actions"><button className="primary" disabled={busy} onClick={()=>{void create('backup')}}>Ladda ner projektbackup</button><button className="secondary" disabled={busy} onClick={()=>{void create('gzip')}}>Ladda ner komprimerad backup (GZIP)</button><button className="secondary" disabled={busy} onClick={()=>{void create('csv')}}>Exportera observationer CSV</button><button className="secondary" disabled={busy} onClick={()=>{void create('xlsx')}}>Exportera observationer XLSX</button></div>
 <h3>Återställ från projektbackup</h3>
 <p>Återställning ersätter projektet och dess lokalt lagrade observationer, fördelningar och inställningar. Exportera en backup av det nuvarande projektet först om du vill kunna återgå.</p>
 <label>Välj projektbackup (JSON eller GZIP)<input aria-label="Välj projektbackup" type="file" accept=".json,.gz,application/gzip" disabled={busy} onChange={e=>{void inspect(e.target.files?.[0])}}/></label>
 {pending!==null&&currentProject&&<section className="notice" aria-label="Granska återställning">
  <h4>Granska innan du återställer</h4>
  <p><strong>Nuvarande projekt (ersätts):</strong> {currentProject.name} · {currentProject.sources} importerade källor.</p>
  <p><strong>Projekt i backupen (återställs):</strong> {pending.project.name} · {pending.project.datasets.length} importerade källor · {pending.semantic.observations.length} observationer.</p>
  <p>Backupen är validerad, men återställningen sker över flera lokala databaser. Vid fel försöker appen återställa tidigare innehåll. Avbryt andra flikars arbete innan du fortsätter.</p>
 </section>}
 <button className="primary" disabled={busy||pending===null||!currentProject} onClick={()=>{void restore()}}>{busy?'Arbetar med backup…':'Bekräfta återställning'}</button>
 {restored&&<div className="actions"><button type="button" className="primary" onClick={()=>window.location.reload()}>Ladda om appen nu</button></div>}
 {info&&<p role="status">{info}</p>}</section>;
}
