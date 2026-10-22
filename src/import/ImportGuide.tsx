import {detectWorkbookKind} from './detectWorkbook';
import {previewMapping,representativeFacts} from './preview';
import TabularImport from './TabularImport';
import {importBudgetFacts} from '../domain/importAdapter';
import {loadSemantic,saveSemantic} from '../domain/semanticStore';
import {defaultMapping,type Mapping} from './uoBudget';
import {useEffect,useState} from 'react';
import {applyMapping,canApprove,deleteDraft,listDrafts,listMappings,readDraft,saveMapping,storeDraft,type Draft} from './drafts';
import type {AnalysisProject} from '../model';
import {saveProject} from '../storage';
import {deleteImportedSources,replaceImportedSource} from './sourceManagement';

export default function ImportGuide({project,onProject,replaceId,setReplaceId}:{project:AnalysisProject|null;onProject:(p:AnalysisProject)=>void;replaceId:string|null;setReplaceId:(id:string|null)=>void}){
 const[drafts,setDrafts]=useState<Draft[]>([]),[selected,setSelected]=useState<string|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const[pendingDelete,setPendingDelete]=useState<string|null>(null),[confirmation,setConfirmation]=useState('');
 const[importMode,setImportMode]=useState<'auto'|'budget'|'tabular'>('auto');
 const[tabularFile,setTabularFile]=useState<File|null>(null);
 useEffect(()=>{void listDrafts().then(setDrafts).catch(()=>setMessage('Kunde inte läsa sparade utkast.'))},[]);
 const refresh=async()=>setDrafts(await listDrafts());
 const files=async(selection:FileList|null)=>{
  if(!selection?.length)return;
  setBusy(true);setMessage('');
  const chosen=Array.from(selection);
  const errors:string[]=[];const budgetFiles:File[]=[];const tableFiles:File[]=[];
  for(const f of chosen){
   try{
    if(!/\.xlsx$/i.test(f.name)||f.size>15*1024*1024)throw new Error('Välj en XLSX-fil på högst 15 MB.');
    const kind=importMode==='auto'?await detectWorkbookKind(await f.arrayBuffer()):importMode;
    if(kind==='budget')budgetFiles.push(f);else tableFiles.push(f);
   }catch(e){errors.push(f.name+': '+(e instanceof Error?e.message:'Okänt fel'));}
  }
  if(tableFiles.length>1){
   errors.push('Flera tabellfiler valdes. Granska och godkänn dem en åt gången.');
  }else if(tableFiles.length===1){
   setTabularFile(tableFiles[0]);
  }else{setTabularFile(null);}
  for(const f of budgetFiles){
   try{const draft=await readDraft(f);setSelected(draft.id)}
   catch(e){errors.push(f.name+': '+(e instanceof Error?e.message:'Okänt fel'))}
  }
  await refresh();setBusy(false);
  if(errors.length)setMessage(errors.join(' • '));
 };
 const remove=async()=>{if(!project||confirmation!=='TA BORT'||busy)return;setBusy(true);try{
  const ids=pendingDelete==='all'?project.datasets.map(d=>d.id):pendingDelete?[pendingDelete]:[];
  const next=await deleteImportedSources(ids,pendingDelete==='all');onProject(next);setSelected(null);setPendingDelete(null);setConfirmation('');setReplaceId(null);await refresh();setMessage(ids.length+' källa/källor och deras observationer har tagits bort. Konfigurationen har bevarats.');
 }catch(e){setMessage('Borttagning misslyckades: '+String(e))}finally{setBusy(false)}};
 const active=drafts.find(d=>d.id===selected)??drafts[0];
 const [preview,setPreview]=useState<Record<keyof Mapping,string>|null>(null);
 const [profile,setProfile]=useState<Mapping>(defaultMapping);
 const [profileName,setProfileName]=useState('');const [savedProfiles,setSavedProfiles]=useState<{name:string;mapping:Mapping}[]>([]);
 useEffect(()=>{void listMappings().then(setSavedProfiles).catch(()=>setMessage('Kunde inte läsa sparade mallprofiler.'))},[]);
 useEffect(()=>{setProfile(active?.mapping??defaultMapping)},[active?.id,active?.mapping]);
 useEffect(()=>{if(!active){setPreview(null);return;}let enabled=true;setPreview(null);void previewMapping(active.bytes,profile).then(p=>{if(enabled)setPreview(p)}).catch(()=>{if(enabled)setPreview(null)});return()=>{enabled=false}},[active,profile]);
 const reparse=async()=>{if(!active)return;setBusy(true);try{await applyMapping(active,profile);await refresh();setMessage('Mappningen har tillämpats. Granska resultatet innan godkännande.')}catch(e){setMessage('Mappningen kunde inte användas: '+(e instanceof Error?e.message:'Okänt fel'))}finally{setBusy(false)}};
 const mappingField=(name:keyof Mapping,label:string)=><label style={{display:'grid',gap:4}}>{label}<input aria-label={label} type={typeof defaultMapping[name]==='number'?'number':'text'} value={profile[name]} onChange={e=>setProfile(p=>({...p,[name]:typeof defaultMapping[name]==='number'?Number(e.target.value):e.target.value}))}/><small className="mapping-preview" aria-live="polite">{preview?.[name]??'Läser cellvärde…'}</small></label>;

 const rename=async(value:string)=>{if(!active)return;await storeDraft({...active,uoName:value,updatedAt:new Date().toISOString()});await refresh();};
 const discard=async(id:string)=>{await deleteDraft(id);if(selected===id)setSelected(null);await refresh();};
 const approve=async()=>{if(!active||!project||!canApprove(active))return;setBusy(true);try{
  if(replaceId){const updated=await replaceImportedSource(replaceId,semantic=>importBudgetFacts(semantic,{...active.result,uo:active.uoName.trim()},replaceId,active.fileName),{name:active.uoName.trim(),planningYear:2027,importedAt:new Date().toISOString(),source:'excel'},active);onProject(updated);setReplaceId(null);setSelected(null);await refresh();setMessage('Källan har ersatts efter godkänd granskning.');return;}
  const datasets=project.datasets.filter(x=>x.id!==active.id);
  datasets.push({id:active.id,name:active.uoName.trim(),planningYear:2027,importedAt:new Date().toISOString(),source:'excel'});
  const next={...project,datasets};
  const semantic=importBudgetFacts(await loadSemantic(),{...active.result,uo:active.uoName.trim()},active.id,active.fileName);
  await saveSemantic(semantic);await saveProject(next);onProject(next);
  await storeDraft({...active,status:'ready',updatedAt:new Date().toISOString()});await refresh();setMessage('Importen godkänd. Källuppgifter finns kvar lokalt och kan användas i kommande analyssteg.');
 }catch{setMessage('Kunde inte spara importen. Utkastet finns kvar för nytt försök.');}finally{setBusy(false);}};
 return <><div className="eyebrow">IMPORT · XLSX</div><h1>Importera och granska underlag</h1>
 <p className="lead">Välj flera filer och granska dem en i taget. Utkast sparas lokalt, så du kan återuppta arbetet efter omladdning. Filer lämnar inte webbläsaren.</p>
 <section className="panel"><h2>Välj Excelunderlag</h2><p>Både budgetmallen och vanliga tabeller är Excel-filer i XLSX-format. Välj en fil och granska föreslagen tolkning innan godkännande. Ingen data skickas till en server.</p>
 <label htmlFor="import-mode">Hur ska filen tolkas?</label><select id="import-mode" aria-label="Importprofil" value={importMode} onChange={e=>setImportMode(e.target.value as typeof importMode)}><option value="auto">Identifiera struktur automatiskt (rekommenderas)</option><option value="budget">UO-budget 2027–2030</option><option value="tabular">Vanlig tabell – processer, personal eller egna data</option></select>
 <label htmlFor="import-files">Välj Excel-filer</label><input id="import-files" type="file" accept=".xlsx" multiple disabled={busy} onChange={e=>{void files(e.target.files);e.target.value='';}}/><p className="notice">Budgetfiler kan väljas flera samtidigt. Tabellfiler granskas en åt gången och du väljer deras mått och kolumner efter filvalet. Byt importprofil ovan om det automatiska förslaget är fel.</p></section>
 {project&&<section className="panel" style={{marginTop:18}}><h2>Importerade källor</h2><p>Ta bort en godkänd källa eller välj Ersätt för att granska en ny Excel-fil innan de gamla värdena byts ut. Konfiguration och gruppmodeller bevaras.</p>
 {project.datasets.length===0?<p>Inga godkända källor.</p>:<><div style={{overflowX:'auto'}}><table className="analysis-table"><thead><tr><th>Källa</th><th>Importerad</th><th>Åtgärder</th></tr></thead><tbody>{project.datasets.map(d=><tr key={d.id}><td>{d.name}</td><td>{new Date(d.importedAt).toLocaleString('sv-SE')}</td><td><div className="actions"><button className="secondary" disabled={busy} onClick={()=>{setReplaceId(d.id);setPendingDelete(null);setMessage('Välj en ny XLSX-fil ovan och granska den. Den gamla källan finns kvar tills den nya importen godkänns.')}}>Ersätt</button><button className="secondary" disabled={busy} onClick={()=>{setPendingDelete(d.id);setConfirmation('')}}>Ta bort</button></div></td></tr>)}</tbody></table></div><button className="secondary" disabled={busy} onClick={()=>{setPendingDelete('all');setConfirmation('')}}>Töm importerade data</button></>}
 {replaceId&&<p role="status" className="notice">Ersätter: {project.datasets.find(d=>d.id===replaceId)?.name}. Välj ny XLSX ovan, granska och godkänn. <button className="secondary" onClick={()=>setReplaceId(null)}>Avbryt ersättning</button></p>}
 {pendingDelete&&<div className="notice" role="group" aria-label="Bekräfta borttagning"><p>{pendingDelete==='all'?'Alla importerade källor och deras analysvärden tas bort.':'Källan och dess importerade analysvärden tas bort.'} Åtgärden kan inte ångras utan projektbackup. Skriv TA BORT för att bekräfta.</p><label>Bekräftelsetext <input aria-label="Bekräftelsetext" value={confirmation} onChange={e=>setConfirmation(e.target.value)}/></label><div className="actions"><button className="primary" disabled={busy||confirmation!=='TA BORT'} onClick={()=>{void remove()}}>Bekräfta borttagning</button><button className="secondary" onClick={()=>{setPendingDelete(null);setConfirmation('')}}>Avbryt</button></div></div>}</section>}
 {tabularFile&&<TabularImport key={tabularFile.name+tabularFile.lastModified} selectedFile={tabularFile} project={project} onProject={p=>{onProject(p);if(replaceId)setReplaceId(null)}} replaceId={replaceId}/>}

 {message&&<p role="status" className="notice">{message}</p>}
 {drafts.length>0&&<div className="analysis-layout" style={{marginTop:20}}><section className="panel filters"><h2>Importerade utkast</h2>{drafts.map(d=><button key={d.id} className={d.id===active?.id?'primary':'secondary'} onClick={()=>setSelected(d.id)}>{d.fileName} ({d.status==='ready'?'Godkänd':'Granska'})</button>)}</section>
 {active&&<section className="panel"><h2>Granska: {active.fileName}</h2><p>Profil: {active.result.profile}</p><label htmlFor="import-uo-name">Utvecklingsområde</label><input id="import-uo-name" value={active.uoName} onChange={e=>{void rename(e.target.value);}}/>
 <p>{active.result.facts.length} detaljvärden identifierade · {active.result.excludedSheets.length} blad utanför profilen</p>
 <section className="mapping-settings"><h2>Anpassa tolkningen av Excelmallen</h2>
 <p>Om en ny mallversion har flyttat uppgifter kan du ange var de finns och läsa om filen. Originalfilen ändras inte.</p>
 <div className="mapping-grid">
 {mappingField('sheet','Bladnamn')}
 {mappingField('uoCell','Cell med UO-namn')}
 {mappingField('headerRow','Rad med periodrubriker')}
 {mappingField('areaColumn','Kolumnnummer för LO')}
 {mappingField('labelColumn','Kolumnnummer för resursslag')}
 {mappingField('startRow','Första datarad')}
 </div><label>Återanvänd profil <select aria-label="Sparade mallprofiler" defaultValue="" onChange={e=>{const found=savedProfiles.find(p=>p.name===e.target.value);if(found)setProfile(found.mapping)}}><option value="">Välj sparad profil</option>{savedProfiles.map(p=><option key={p.name} value={p.name}>{p.name}</option>)}</select></label>
 <label>Profilnamn <input aria-label="Profilnamn" value={profileName} onChange={e=>setProfileName(e.target.value)}/></label>
 <button className="secondary" disabled={!profileName.trim()} onClick={()=>{void saveMapping(profileName,profile).then(()=>listMappings()).then(setSavedProfiles).then(()=>setMessage('Mallprofilen sparad för framtida importer.')).catch(()=>setMessage('Kunde inte spara mallprofilen.'))}}>Spara mallprofil</button> <button className="secondary" disabled={busy||!profile.sheet.trim()||!profile.uoCell.trim()||profile.headerRow<1||profile.areaColumn<1||profile.labelColumn<1||profile.startRow<1} onClick={()=>{void reparse()}}>Tillämpa mappning</button>
 </section><h2>Kontroller</h2>{active.result.issues.length===0?<p>Inga avvikelser upptäckta av nuvarande profil.</p>:<ul>{active.result.issues.map((i,n)=><li key={n}>{i.severity==='error'?'Fel':'Varning'}: {i.message} {i.cell?('('+i.cell+')'):''}</li>)}</ul>}
 <h2>Förhandsgranskning – ett exempel per mått</h2><p>Visar första detaljvärdet för varje mått, inte totalsummor. Totalt {active.result.facts.length} detaljvärden identifierade. Granska alltid källhänvisningarna.</p><div style={{overflowX:'auto'}}><table style={{width:'100%',textAlign:'left'}}><thead><tr><th>LO</th><th>Mått</th><th>År</th><th>Värde</th><th>Källa</th></tr></thead><tbody>{representativeFacts(active.result.facts).map((fact,i)=><tr key={i}><td>{fact.area}</td><td>{fact.measure}</td><td>{fact.period.year}</td><td>{fact.value} {fact.unit}</td><td>{fact.source.sheet}!{fact.source.cell}</td></tr>)}</tbody></table></div>
 <div className="actions"><button className="primary" disabled={busy||!canApprove(active)||!project} onClick={()=>{void approve()}}>Godkänn import</button><button className="secondary" disabled={busy||active.status==="ready"} onClick={()=>{void discard(active.id)}}>Ta bort utkast</button></div>
 {active.status==='ready'&&<p className="notice">Tidigare godkänd. Ändringar behöver godkännas igen för att uppdatera projektet.</p>}
 </section>}</div>}
 </>;
}
