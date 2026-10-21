import {useState} from 'react';
import {captureProject,restoreProject} from './store';
import {exportFactsCsv,backupToJson,validateBackup} from './format';
function download(name:string,data:string,mime:string){
 const blob=new Blob([data],{type:mime});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export default function PortabilityView(){
 const [pending,setPending]=useState<unknown|null>(null),[info,setInfo]=useState(''),[busy,setBusy]=useState(false);
 const create=async(kind:'backup'|'csv')=>{setBusy(true);try{const b=await captureProject();if(kind==='backup')download('utvecklingsanalys-projekt-v1.json',backupToJson(b),'application/json');else download('utvecklingsanalys-observationer.csv',exportFactsCsv(b.semantic),'text/csv;charset=utf-8');setInfo('Export skapad. Förvara backupen säkert.')}catch(e){setInfo('Export misslyckades: '+String(e))}finally{setBusy(false)}};
 const inspect=async(file?:File)=>{setPending(null);if(!file)return;if(file.size>25*1024*1024){setInfo('Projektfilen får vara högst 25 MB.');return}try{const parsed=validateBackup(JSON.parse(await file.text()));setPending(parsed);setInfo('Validerad backup: '+parsed.project.name+', '+parsed.semantic.observations.length+' observationer.')}catch(e){setInfo('Filen avvisades: '+String(e))}};
 const restore=async()=>{if(!pending)return;setBusy(true);try{await restoreProject(pending);setInfo('Projekt återställt. Ladda om sidan för att uppdatera alla vyer.');setPending(null)}catch(e){setInfo('Återställning misslyckades: '+String(e))}finally{setBusy(false)}};
 return <section className="panel"><h2>Projektbackup och dataexport</h2><p>Spara projektinformation, observationer, planeringsscenarier och konfiguration i en versionsmärkt JSON-backup. Exceloriginal och arbetsutkast ingår inte.</p>
 <div className="actions"><button className="primary" disabled={busy} onClick={()=>{void create('backup')}}>Ladda ner projektbackup</button><button className="secondary" disabled={busy} onClick={()=>{void create('csv')}}>Exportera observationer CSV</button></div>
 <h3>Återställ från projektbackup</h3><label>Välj projektbackup (JSON)<input aria-label="Välj projektbackup" type="file" accept=".json" onChange={e=>{void inspect(e.target.files?.[0])}}/></label>
 {pending!==null&&<p>Backupen är validerad. Nuvarande projektdata ersätts vid bekräftelse. Spara först en egen backup om du behöver behålla nuvarande projekt.</p>}
 <button className="primary" disabled={busy||pending===null} onClick={()=>{void restore()}}>Bekräfta återställning</button>
 {info&&<p role="status">{info}</p>}</section>;
}
