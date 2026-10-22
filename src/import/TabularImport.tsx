import {useEffect,useState} from 'react';
import {inspectTable,parseTable,type TableMapping,type TableProfile,type TableResult} from './tabular';
import {importTableFacts,tableIdentityIssues,type Resolution} from './tabularAdapter';
import {loadSemantic,saveSemantic} from '../domain/semanticStore';
import {replaceImportedSource} from './sourceManagement';
import {saveProject} from '../storage';
import type {AnalysisProject} from '../model';
import type {SemanticDataset} from '../domain/semantic';
export default function TabularImport({project,onProject,selectedFile,replaceId}:{project:AnalysisProject|null;onProject:(p:AnalysisProject)=>void;selectedFile:File;replaceId:string|null}){
 const[file,setFile]=useState<File|null>(null),[bytes,setBytes]=useState<ArrayBuffer|null>(null),[mapping,setMapping]=useState<TableMapping|null>(null),[profile,setProfile]=useState<TableProfile>('generic'),[result,setResult]=useState<TableResult|null>(null),[semantic,setSemantic]=useState<SemanticDataset|null>(null),[resolutions,setResolutions]=useState<Resolution>({}),[error,setError]=useState(''),[busy,setBusy]=useState(false),[sheets,setSheets]=useState<string[]>([]);
 const start=async(f:File|undefined)=>{if(!f)return;setBusy(true);setError('');setResult(null);setResolutions({});try{
  if(!/\.xlsx$/i.test(f.name)||f.size>15*1024*1024)throw new Error('Välj en XLSX-fil på högst 15 MB.');
  const data=await f.arrayBuffer(),ins=await inspectTable(data);
  setFile(f);setBytes(data);setMapping(ins.mapping);setProfile(ins.suggested);setSheets(ins.sheets);setSemantic(await loadSemantic());
 }catch(e){setError(e instanceof Error?e.message:'Filen kunde inte öppnas.')}finally{setBusy(false)}};
 useEffect(()=>{void start(selectedFile)},[selectedFile]);
 const parse=async()=>{if(!bytes||!mapping)return;setBusy(true);setError('');try{const parsed=await parseTable(bytes,profile,mapping);setResult(parsed);setResolutions({})}catch(e){setError(e instanceof Error?e.message:'Importen misslyckades.')}finally{setBusy(false)}};
 const issues=semantic&&result?tableIdentityIssues(semantic,result,resolutions):[];
 const approve=async()=>{if(!semantic||!result||!file||!project||result.issues.some(i=>i.severity==='error')||issues.length)return;setBusy(true);try{
  if(replaceId){const updated=await replaceImportedSource(replaceId,before=>importTableFacts(before,result,replaceId,file.name,resolutions),{name:file.name,planningYear:result.facts[0].year,source:'excel',importedAt:new Date().toISOString()});onProject(updated);setResult(null);setFile(null);setBytes(null);setError('Källan har ersatts efter godkänd tabellgranskning.');return;}
  const id=crypto.randomUUID();const next=importTableFacts(semantic,result,id,file.name,resolutions);
  await saveSemantic(next);setSemantic(next);
  const updated={...project,datasets:[...project.datasets,{id,name:file.name,planningYear:result.facts[0].year,source:'excel' as const,importedAt:new Date().toISOString()}]};await saveProject(updated);onProject(updated);setResult(null);setFile(null);setBytes(null);setError('Importen har godkänts och sparats.'); 
 }catch(e){setError(e instanceof Error?e.message:'Kunde inte spara importen.')}finally{setBusy(false)}};
 const field=(key:keyof TableMapping,label:string)=>mapping&&<label>{label}<input aria-label={label} value={String(mapping[key])} onChange={e=>{setMapping(m=>m?{...m,[key]:key==='headerRow'?Number(e.target.value):e.target.value}:m);setResult(null)}}/></label>;
 return <section className="panel"><h2>Processer, personal och generiska tabeller</h2><p>Importera tabeller med rubrikrad, objektnamn, år och numeriska värden. Granska alltid föreslagen profil och objektmatchning innan godkännande.</p>
 <p className="notice">Vald fil: {selectedFile.name}. Detta är också en Excel-fil (XLSX), med en tabellstruktur. Du kan ändra föreslagen profil nedan.</p>
 {mapping&&<><p>Föreslagen profil</p><label>Profil <select aria-label="Tabellprofil" value={profile} onChange={e=>{setProfile(e.target.value as TableProfile);setResult(null)}}><option value="process-hours">Processarbete</option><option value="staff-snapshot">Personal och FTE</option><option value="generic">Generisk tabell</option></select></label>
 <label>Kalkylblad <select aria-label="Tabellblad" value={mapping.sheet} onChange={e=>{setMapping({...mapping,sheet:e.target.value});setResult(null)}}>{sheets.map(s=><option value={s} key={s}>{s}</option>)}</select></label>
 <div className="mapping-grid">{field('headerRow','Rubrikrad')}{field('entityColumn','Objektskolumn')}{field('yearColumn','Årskolumn')}{field('valueColumn','Värdekolumn')}</div>
 <label>Objekttyp <select aria-label="Objekttyp" value={mapping.entityKind} onChange={e=>{setMapping({...mapping,entityKind:e.target.value as TableMapping['entityKind']});setResult(null)}}><option value="process">Process</option><option value="department">Avdelning</option><option value="organization">Organisation</option></select></label>
 <label>Mått <select aria-label="Tabellmått" value={mapping.measureId} onChange={e=>{setMapping({...mapping,measureId:e.target.value});setResult(null)}}><option value="business_hours">Verksamhetstimmar</option><option value="it_hours">IT-timmar</option><option value="headcount">Antal anställda</option><option value="fte">Årsarbetskrafter (FTE)</option></select></label>
 <div className="actions"><button className="secondary" disabled={busy} onClick={()=>{void parse()}}>Granska tabell</button></div></>}
 {result&&<><p>{result.facts.length} numeriska observationer, {result.issues.length} avvikelser.</p><ul>{result.issues.map((i,k)=><li key={k}>{i.severity}: rad {i.row??'–'} – {i.message}</li>)}</ul>
 <div style={{overflowX:'auto'}}><table className="analysis-table"><thead><tr><th>Objekt</th><th>År</th><th>Värde</th><th>Källa</th></tr></thead><tbody>{result.facts.slice(0,20).map((f,i)=><tr key={i}><td>{f.entityName}</td><td>{f.year}</td><td>{f.value}</td><td>{f.source.sheet}!{f.source.cell}</td></tr>)}</tbody></table></div>
 {semantic&&[...new Map(result.facts.map(f=>[f.entityKind+':'+f.entityName,f])).values()].map(f=>{const key=f.entityKind+':'+f.entityName;const candidates=semantic.entities.filter(e=>e.kind===f.entityKind&&(e.name.trim().toLowerCase()===f.entityName.trim().toLowerCase()||e.aliases.some(a=>a.trim().toLowerCase()===f.entityName.trim().toLowerCase())));return candidates.length>0&&<label key={key}>Objektmatchning: {f.entityName}<select aria-label={'Objektmatchning '+f.entityName} value={resolutions[key]??(candidates.length===1&&candidates[0].name===f.entityName?candidates[0].id:'')} onChange={e=>setResolutions(r=>({...r,[key]:e.target.value}))}><option value="">Välj matchning</option>{candidates.map(c=><option key={c.id} value={c.id}>{c.name} ({c.id})</option>)}</select></label>})}
 {issues.length>0&&<p role="alert">{issues.join(' · ')}</p>}
 <button className="primary" disabled={busy||!project||result.issues.some(i=>i.severity==='error')||issues.length>0} onClick={()=>{void approve()}}>Godkänn tabellimport</button></>}
 {error&&<p role="status">{error}</p>}</section>;
}
