import {useState} from 'react';
import {resetLocalWorkspace,type ResetScope} from './reset';
import {backupToJson} from '../portability/format';
import {captureProject} from '../portability/store';
export default function ResetWorkspace(){
 const [scope,setScope]=useState<ResetScope>('all'),[confirmation,setConfirmation]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const backup=async()=>{
  setBusy(true);setMessage('');
  try{
   const json=backupToJson(await captureProject()),blob=new Blob([json],{type:'application/json'}),url=URL.createObjectURL(blob),anchor=document.createElement('a');
   anchor.href=url;anchor.download='utvecklingsanalys-fore-aterstallning.json';anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
   setMessage('Säkerhetskopia skapad. Kontrollera att filen sparats innan du återställer.');
  }catch(e){setMessage('Backup kunde inte skapas: '+String(e))}
  finally{setBusy(false)}
 };
 const reset=async()=>{
  if(confirmation!=='ÅTERSTÄLL'||busy)return;
  setBusy(true);setMessage('');
  try{await resetLocalWorkspace(scope);window.location.reload()}
  catch(e){setMessage('Återställningen kunde inte slutföras. Vissa lokala delar kan ha rensats. Ladda INTE in nya data förrän du kontrollerat läget eller återställt en säkerhetskopia. '+String(e));setBusy(false)}
 };
 return <section className="panel" aria-label="Återställ arbetsyta"><h2>Återställ lokal arbetsyta</h2>
 <p className="notice">Återställning tar bort information från denna applikations lokala datalager i webbläsaren. Den kan inte ångras utan en tidigare exporterad projektbackup.</p>
 <fieldset><legend>Vad vill du återställa?</legend>
 <label className="check"><input type="radio" name="reset-scope" checked={scope==='data'} onChange={()=>{setScope('data');setConfirmation('')}}/>Töm data – projekt, importutkast, observationer, planering och kompletteringar; behåll konfiguration</label>
 <label className="check"><input type="radio" name="reset-scope" checked={scope==='configuration'} onChange={()=>{setScope('configuration');setConfirmation('')}}/>Återställ konfiguration – mallprofiler, gruppmodeller, fördelningsdefinitioner och revisionshistorik; behåll data</label>
 <label className="check"><input type="radio" name="reset-scope" checked={scope==='all'} onChange={()=>{setScope('all');setConfirmation('')}}/>Återställ allt – både data och konfiguration till första-startsläge</label>
 </fieldset>
 <button className="secondary" disabled={busy} onClick={()=>{void backup()}}>Ladda ner säkerhetskopia innan återställning</button>
 <label>Bekräfta med ÅTERSTÄLL<input aria-label="Bekräfta återställning" autoComplete="off" value={confirmation} onChange={e=>setConfirmation(e.target.value)}/></label>
 <button className="primary" disabled={busy||confirmation!=='ÅTERSTÄLL'} onClick={()=>{void reset()}}>Genomför vald återställning</button>
 {message&&<p role="status">{message}</p>}
 </section>;
}
