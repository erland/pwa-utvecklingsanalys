import {gzipBackup,readBackupFile} from './compression';
import {useState} from 'react';
import {captureProject,restoreProject} from './store';
import {exportFactsCsv,exportFactsXlsx,backupToJson,validateBackup} from './format';
function download(name:string,data:string,mime:string){
 const blob=new Blob([data],{type:mime});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export default function PortabilityView(){
 const [pending,setPending]=useState<unknown|null>(null),[info,setInfo]=useState(''),[busy,setBusy]=useState(false);
 const create=async(kind:'backup'|'gzip'|'csv'|'xlsx')=>{setBusy(true);try{const b=await captureProject();if(kind==='backup')download('utvecklingsanalys-projekt-v2.json',backupToJson(b),'application/json');else if(kind==='gzip'){const blob=await gzipBackup(backupToJson(b));const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='utvecklingsanalys-projekt-v2.json.gz';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}else if(kind==='csv')download('utvecklingsanalys-observationer.csv',exportFactsCsv(b.semantic),'text/csv;charset=utf-8');else {const buffer=await exportFactsXlsx(b.semantic);const blob=new Blob([buffer],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='utvecklingsanalys-observationer.xlsx';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}setInfo('Export skapad. Förvara backupen säkert.')}catch(e){setInfo('Export misslyckades: '+String(e))}finally{setBusy(false)}};
 const inspect=async(file?:File)=>{setPending(null);if(!file)return;try{const parsed=validateBackup(await readBackupFile(file));setPending(parsed);setInfo('Validerad backup: '+parsed.project.name+', '+parsed.semantic.observations.length+' observationer.')}catch(e){setInfo('Filen avvisades: '+String(e))}};
 const restore=async()=>{if(!pending)return;setBusy(true);try{await restoreProject(pending);setInfo('Projekt återställt. Ladda om sidan för att uppdatera alla vyer.');setPending(null)}catch(e){setInfo('Återställning misslyckades: '+String(e))}finally{setBusy(false)}};
 return <section className="panel"><h2>Projektbackup och dataexport</h2><p>Spara projektinformation, observationer, planeringsscenarier och konfiguration i en versionsmärkt JSON-backup. Sparade Excelarbetsböcker i importutkast och konfigurationens revisionshistorik ingår. Original som inte längre finns sparade lokalt kan inte återskapas.</p>
 <div className="actions"><button className="primary" disabled={busy} onClick={()=>{void create('backup')}}>Ladda ner projektbackup</button><button className="secondary" disabled={busy} onClick={()=>{void create('gzip')}}>Ladda ner komprimerad backup (GZIP)</button><button className="secondary" disabled={busy} onClick={()=>{void create('csv')}}>Exportera observationer CSV</button><button className="secondary" disabled={busy} onClick={()=>{void create('xlsx')}}>Exportera observationer XLSX</button></div>
 <h3>Återställ från projektbackup</h3><label>Välj projektbackup (JSON)<input aria-label="Välj projektbackup" type="file" accept=".json,.gz,application/gzip" onChange={e=>{void inspect(e.target.files?.[0])}}/></label>
 {pending!==null&&<p>Backupen är validerad. Nuvarande projektdata ersätts vid bekräftelse. Spara först en egen backup om du behöver behålla nuvarande projekt.</p>}
 <button className="primary" disabled={busy||pending===null} onClick={()=>{void restore()}}>Bekräfta återställning</button>
 {info&&<p role="status">{info}</p>}</section>;
}
