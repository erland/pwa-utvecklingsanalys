import {onWorkspaceChange,type WorkspaceChange} from './storage/workspaceEvents';
import {useEffect,useRef,useState} from 'react';
import type {ViewId} from './model';
import {useProjectWorkspace} from './app/useProjectWorkspace';
import ResetWorkspace from './reset/ResetWorkspace';
import PortabilityView from './portability/PortabilityView';
import GapView from './gaps/GapView';
import GroupsView from './analytics/GroupsView';
import ConfigurationView from './config/ConfigurationView';
import PlanningView from './planning/PlanningView';
import AllocationsView from './allocations/AllocationsView';
import OptionalAllocationsView from './allocations/OptionalAllocationsView';
import RelationsView from './domain/RelationsView';
import AnalyticsView from './analytics/AnalyticsView';
import ImportGuide from './import/ImportGuide';
import {Activity,BarChart3,FileSpreadsheet,Settings2,ShieldCheck,Layers3,GitBranch,ChartPie,ClipboardCheck,PackageOpen} from 'lucide-react';
const nav: {id:ViewId;label:string;icon:typeof Activity}[]=[{id:'overview',label:'Översikt',icon:Activity},{id:'import',label:'Import',icon:FileSpreadsheet},{id:'analysis',label:'Analys',icon:BarChart3},{id:'gaps',label:'Kompletteringar',icon:ClipboardCheck},{id:'groups',label:'Grupper',icon:Layers3},{id:'relations',label:'Relationer',icon:GitBranch},{id:'allocations',label:'Fördelningar',icon:ChartPie},{id:'planning',label:'Planering',icon:ClipboardCheck},{id:'configuration',label:'Konfiguration',icon:PackageOpen},{id:'settings',label:'Inställningar',icon:Settings2}];
const legacyNavigationGroups: {label:string;items:ViewId[]}[]=[
 {label:'Analysera',items:['overview','analysis']},
 {label:'Konfigurera',items:['import','groups','relations','configuration']},
 {label:'Komplettera',items:['gaps','allocations','planning']},
 {label:'Projekt',items:['settings']}
];
// Only the Playwright compatibility fixture enables historic UI workflows.
// The normal PWA never advertises manual configuration screens.
export default function App(){
 const[replaceSourceId,setReplaceSourceId]=useState<string|null>(null);
 const navigationRef=useRef<HTMLElement|null>(null);
 const [legacyNav]=useState(()=>typeof localStorage!=='undefined'&&localStorage.getItem('utvecklingsanalys:e2e-legacy-navigation')==='1');
 const navigationGroups=legacyNav?legacyNavigationGroups:[{label:'',items:['overview','import','allocations','analysis','settings'] as ViewId[]}];
 const [view,setView]=useState<ViewId>('overview');
 const [otherTabChanged,setOtherTabChanged]=useState<WorkspaceChange|null>(null);
 const {project,analysisRefresh,storageError,overview,overviewError,analysisAvailable,
  nameSaveStatus,openAnalysis,updateName,retryNameSave,projectImported,refreshAnalysis}=useProjectWorkspace(view,setView);
 useEffect(()=>onWorkspaceChange(type=>{
  if(type==='gap-state-changed'&&!['import','gaps','allocations','analysis'].includes(view))return;
  setOtherTabChanged(type);
 }),[view]);
 return <div className="shell"><a className="skip-link" href="#main-content">Hoppa till innehållet</a><aside className="sidebar"><div className="brand"><span className="brandmark"><BarChart3 size={24}/></span><div><strong>Utvecklingsanalys</strong><small>Analysarbetsyta</small></div></div><div className="mobile-nav-tools" aria-label="Bläddra i huvudmenyn">
 <span>Fler vyer? Svep menyn eller använd pilarna.</span>
 <button type="button" className="mobile-nav-arrow" aria-label="Bläddra menyn åt vänster" onClick={()=>navigationRef.current?.scrollBy({left:-210,behavior:'auto'})}>‹</button>
 <button type="button" className="mobile-nav-arrow" aria-label="Bläddra menyn åt höger" onClick={()=>navigationRef.current?.scrollBy({left:210,behavior:'auto'})}>›</button>
 </div><nav ref={navigationRef} aria-label="Huvudmeny">{navigationGroups.map(group=><div className="nav-group" key={group.label}>{group.label&&<span className="nav-group-title">{group.label}</span>}{group.items.map(id=>{const n=nav.find(item=>item.id===id)!;return <button key={n.id} type="button" aria-current={view===n.id?'page':undefined} className={view===n.id?'nav-link active':'nav-link'} aria-disabled={n.id==='analysis'&&!analysisAvailable?'true':undefined} title={n.id==='analysis'&&!analysisAvailable?'Importera analysuppgifter för att aktivera Analys':undefined} onClick={()=>n.id==='analysis'?(analysisAvailable?void openAnalysis():undefined):setView(n.id)}><n.icon size={19} aria-hidden="true"/>{n.label}</button>})}</div>)}</nav><div className="sidebar-foot"><ShieldCheck size={16}/>Lokal data · ingen server</div></aside>
 <div className="content"><header className="topbar"><div><strong>{project?.name??'Mitt analysprojekt'}</strong><small>Projektdata lagras lokalt</small></div><span className="pill">Lokal analys</span></header><main id="main-content">
 {otherTabChanged&&<div role="alert" className="alert"><strong>{otherTabChanged==='gap-state-changed'?'Kompletteringar eller fördelningar har ändrats i en annan flik.':otherTabChanged==='workspace-reset'?'Arbetsytan har återställts i en annan flik.':'Arbetsytan har ändrats i en annan flik.'}</strong> Ladda om innan du fortsätter för att undvika att skriva tillbaka gamla data. <button type="button" className="primary" onClick={()=>window.location.reload()}>Ladda om nu</button></div>}
 {storageError&&<div role="alert" className="alert">{storageError}</div>}
 {view==='overview'&&<><div className="eyebrow">ÖVERSIKT</div><h1>Överblick över verksamhetsutvecklingen</h1><p className="lead">Samla Excelunderlag från olika källor, justera fördelningar och analysera utvecklingens inriktning. Alla värden hämtas från ditt lokala projekt.</p>
 {overviewError&&<p role="alert">{overviewError}</p>}
 {overview&&<div className="cards" aria-label="Projektstatus"><div className="metric"><span>Importerade källor</span><b>{overview.sources}</b><small>Excelunderlag i projektet</small></div><div className="metric"><span>Automatiska LO-fördelningar</span><b>{overview.approved}</b><small>Fördelningar per UO och år</small></div><div className="metric"><span>Underlag att kontrollera</span><b>{overview.pending}</b><small>Fördelningar som behöver justeras</small></div></div>}
 <section className="panel"><h2>{overview?.hasData?'Fortsätt arbeta':'Börja här'}</h2><p>{overview?.hasData?`Underlaget innehåller ${overview.uos} UO och ${overview.years} år med observationer. Du kan importera fler källor, justera fördelningar eller gå till analysen.`:'Importera en eller flera Excel-filer för att börja analysera dina uppgifter.'}</p><div className="actions">{overview?.hasData&&overview.pending>0&&<button className="primary" onClick={()=>setView('allocations')}>Visa fördelningar ({overview.pending})</button>}{overview?.hasData&&<button className={overview.pending>0?'secondary':'primary'} onClick={()=>void openAnalysis()}>Gå till analysen →</button>}<button className={overview?.hasData?'secondary':'primary'} onClick={()=>setView('import')}>{overview?.hasData?'Visa källor och import':'Importera Excel-filer'}</button></div></section></>}

 {view==='gaps'&&<GapView/>}
 {view==='analysis'&&(analysisAvailable?<AnalyticsView refreshKey={analysisRefresh} onOpenCompletions={()=>setView(legacyNav?'gaps':'import')}/>:<section className="panel"><h2>Importera analysuppgifter först</h2><p>Det finns ännu inga importerade analysvärden i projektet.</p><button className="primary" onClick={()=>setView('import')}>Gå till importen</button></section>)}
 {view==='import'&&<ImportGuide replaceId={replaceSourceId} setReplaceId={setReplaceSourceId} onAnalyze={()=>{void openAnalysis()}} onAllocations={()=>setView('allocations')} project={project} onProject={projectImported}/>}
 {view==='relations'&&<RelationsView/>}
 {view==='allocations'&&(legacyNav?<AllocationsView/>:<><div className="eyebrow">ARBETSFÖRDELNING</div><h1>Fördelningar</h1><OptionalAllocationsView mode="rules"/></>)}
 {view==='planning'&&<PlanningView/>}
 {view==='configuration'&&<ConfigurationView/>}
 {view==='groups'&&<GroupsView onSaved={refreshAnalysis}/>}
 {view==='settings'&&<><div className="eyebrow">PROJEKT</div><h1>Inställningar</h1><p className="lead">Hantera projektet, UO-grupper och fördelningstyper. Backup och återställning finns i ett separat avsnitt längst ner.</p>
 <section className="panel" aria-label="Projektinställningar"><h2>Projekt</h2><label htmlFor="project-name">Namn på lokalt projekt</label><input id="project-name" value={project?.name??''} disabled={!project} onChange={e=>updateName(e.target.value)}/>
 <div aria-live="polite" aria-atomic="true" className="project-save-feedback">{nameSaveStatus==='saving'?'Sparar projektnamn…':nameSaveStatus==='saved'?'Projektnamnet är sparat.':nameSaveStatus==='error'?'Projektnamnet kunde inte sparas.':''}</div>
 {nameSaveStatus==='error'&&<button type="button" className="secondary" onClick={retryNameSave}>Försök spara igen</button>}
 <p className="notice">Projektet lagras lokalt i IndexedDB. Exportera en backup regelbundet.</p></section>
 <section aria-label="Administrera UO-grupper" style={{marginTop:24}}><GroupsView onSaved={refreshAnalysis} embedded/></section>
 <section aria-label="Administrera fördelningstyper" style={{marginTop:24}}><OptionalAllocationsView/></section>
 <section className="panel" aria-label="Backup och återställning" style={{marginTop:24}}><h2>Backup och återställning</h2><p>Exportera projektdata eller återställ en säkerhetskopia. Återställning av arbetsytan finns längst ner och bör användas med försiktighet.</p><PortabilityView/><ResetWorkspace/></section></>}

 </main><footer>Utvecklingsanalys · Lokal analysarbetsyta</footer></div></div>
}
