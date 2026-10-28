import {recoverSourceMutation} from './import/sourceManagement';
import {recoverInterruptedRestore} from './portability/store';
import ResetWorkspace from './reset/ResetWorkspace';
import PortabilityView from './portability/PortabilityView';
import GapView from './gaps/GapView';
import GroupsView from './analytics/GroupsView';
import ConfigurationView from './config/ConfigurationView';
import PlanningView from './planning/PlanningView';
import AllocationsView from './allocations/AllocationsView';
import RelationsView from './domain/RelationsView';
import AnalyticsView from './analytics/AnalyticsView';
import ImportGuide from './import/ImportGuide';
import {useEffect,useState} from 'react';
import {Activity,BarChart3,FileSpreadsheet,Settings2,ShieldCheck,Layers3,GitBranch,ChartPie,ClipboardCheck,PackageOpen} from 'lucide-react';
import {DEMO_UNITS,aggregate,type AnalysisProject,type ViewId} from './model';
import{loadProject,saveProject}from './storage';
const nav: {id:ViewId;label:string;icon:typeof Activity}[]=[{id:'overview',label:'Översikt',icon:Activity},{id:'import',label:'Import',icon:FileSpreadsheet},{id:'analysis',label:'Analys',icon:BarChart3},{id:'gaps',label:'Kompletteringar',icon:ClipboardCheck},{id:'groups',label:'Grupper',icon:Layers3},{id:'relations',label:'Relationer',icon:GitBranch},{id:'allocations',label:'Fördelningar',icon:ChartPie},{id:'planning',label:'Planering',icon:ClipboardCheck},{id:'configuration',label:'Konfiguration',icon:PackageOpen},{id:'settings',label:'Inställningar',icon:Settings2}];
const navigationGroups: {label:string;items:ViewId[]}[]=[
 {label:'Analysera',items:['overview','analysis']},
 {label:'Konfigurera',items:['import','groups','relations','configuration']},
 {label:'Komplettera',items:['gaps','allocations','planning']},
 {label:'Projekt',items:['settings']}
];
const fmt=(n:number)=>new Intl.NumberFormat('sv-SE').format(n);
export default function App(){
 const[replaceSourceId,setReplaceSourceId]=useState<string|null>(null);
 const[analysisRefresh,setAnalysisRefresh]=useState(0);const[view,setView]=useState<ViewId>('overview');const[project,setProject]=useState<AnalysisProject|null>(null);const[storageError,setStorageError]=useState('');
 useEffect(()=>{let active=true;recoverInterruptedRestore().then(()=>recoverSourceMutation()).then(()=>loadProject()).then(p=>{if(active)setProject(p)}).catch(()=>{if(active)setStorageError('Lokal lagring eller återställning misslyckades. Kontrollera datalagringen innan du fortsätter.')});return()=>{active=false}},[]);
 const updateName=async(name:string)=>{if(!project)return;const p={...project,name};setProject(p);try{await saveProject(p);setStorageError('')}catch{setStorageError('Kunde inte spara projektet lokalt.')}};
 return <div className="shell"><a className="skip-link" href="#main-content">Hoppa till innehållet</a><aside className="sidebar"><div className="brand"><span className="brandmark"><BarChart3 size={24}/></span><div><strong>Utvecklingsanalys</strong><small>Analysarbetsyta</small></div></div><nav aria-label="Huvudmeny">{navigationGroups.map(group=><div className="nav-group" key={group.label}><span className="nav-group-title">{group.label}</span>{group.items.map(id=>{const n=nav.find(item=>item.id===id)!;return <button key={n.id} type="button" aria-current={view===n.id?'page':undefined} className={view===n.id?'nav-link active':'nav-link'} onClick={()=>setView(n.id)}><n.icon size={19} aria-hidden="true"/>{n.label}</button>})}</div>)}</nav><div className="sidebar-foot"><ShieldCheck size={16}/>Lokal data · ingen server</div></aside>
 <div className="content"><header className="topbar"><div><strong>{project?.name??'Mitt analysprojekt'}</strong><small>Projektbackup · DEV-011</small></div><span className="pill">Lokal analys</span></header><main id="main-content">
 {storageError&&<div role="alert" className="alert">{storageError}</div>}
 {view==='overview'&&<><div className="eyebrow">VÄLKOMMEN</div><h1>Överblick över verksamhetsutvecklingen</h1><p className="lead">Samla uppgifter från olika källor och analysera utvecklingens inriktning. Exempelvärden är tydligt avskilda från analys av importerade uppgifter.</p><div className="cards"><div className="metric"><span>Importerade filer</span><b>{project?.datasets.length??0}</b><small>Data lagras i webbläsaren</small></div><div className="metric"><span>Utvecklingsområden i demo</span><b>{DEMO_UNITS.length}</b><small>Illustrativt urval</small></div><div className="metric"><span>Demo – totalt antal timmar</span><b>{fmt(aggregate(DEMO_UNITS,'all','all','unit').reduce((s,x)=>s+x.hours,0))}</b><small>Påhittade värden</small></div></div><section className="panel"><h2>Börja här</h2><p>Importera en Excel-fil för att analysera faktiska uppgifter i den nya analysvyn.</p><div className="actions"><button className="primary" onClick={()=>setView('analysis')}>Gå till analysen →</button><button className="secondary" onClick={()=>setView('import')}>Importera Excel-filer</button></div></section></>}
 {view==='gaps'&&<GapView/>}
 {view==='analysis'&&<AnalyticsView refreshKey={analysisRefresh} onOpenCompletions={()=>setView('gaps')}/>}
 {view==='import'&&<ImportGuide replaceId={replaceSourceId} setReplaceId={setReplaceSourceId} project={project} onProject={p=>{setProject(p);setAnalysisRefresh(v=>v+1)}}/>}
 {view==='relations'&&<RelationsView/>}
 {view==='allocations'&&<AllocationsView/>}
 {view==='planning'&&<PlanningView/>}
 {view==='configuration'&&<ConfigurationView/>}
 {view==='groups'&&<GroupsView onSaved={()=>setAnalysisRefresh(v=>v+1)}/>}
 {view==='settings'&&<><div className="eyebrow">PROJEKT</div><h1>Inställningar</h1><section className="panel"><h2>Projektnamn</h2><label htmlFor="project-name">Namn på lokalt projekt</label><input id="project-name" value={project?.name??''} disabled={!project} onChange={e=>{void updateName(e.target.value)}}/><p className="notice">Projektet lagras lokalt i IndexedDB. Exportera en backup regelbundet.</p><PortabilityView/><ResetWorkspace/></section></>}
 </main><footer>Utvecklingsanalys · DEV-011 · Demodata är syntetisk</footer></div></div>
}
