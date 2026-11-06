import {useState} from 'react';
import type {CanonicalDataset,Metric} from '../domain/canonical';
import type {GapState} from '../gaps/store';
import ProjectActivityEditor from './ProjectActivityEditor';
import {effectiveProjectActivitySplits,projectAllocationRows} from './projectActivityAllocation';

type Unit='hours'|'costs';
const kindMetrics:Record<Unit,Metric[]>={hours:['it_hours','business_hours'],costs:['consultant_cost','other_cost']};
const label=(id:string)=>{try{return decodeURIComponent(id.slice('project:'.length))}catch{return id}};

/** Projects use the same stored decisions as the analysis; there is no parallel allocation model. */
export function projectAllocationOverview(data:CanonicalDataset,gaps:GapState,unit:Unit,year:number){
 const rows=projectAllocationRows(data).filter(r=>kindMetrics[unit].includes(r.metric)&&(year===0||r.year===year));
 const active=new Set(effectiveProjectActivitySplits(data,gaps.projectActivitySplits??[],gaps.projectImportCompletions??[]).map(d=>d.workloadId));
 const projects=new Map<string,{id:string;records:number;allocated:number;total:number}>();
 for(const row of rows){
  if(row.scope.axis!=='project')continue;
  const previous=projects.get(row.scope.projectId)??{id:row.scope.projectId,records:0,allocated:0,total:0};
  previous.records++;previous.total+=row.value;
  if(active.has(row.workloadId))previous.allocated++;
  projects.set(row.scope.projectId,previous);
 }
 return [...projects.values()].sort((a,b)=>label(a.id).localeCompare(label(b.id),'sv'));
}

/** Only saved, source-valid allocations contribute to a visible development/maintenance split.
 * Unallocated volume stays separate rather than being represented as 0% development.
 */
export function projectAllocationVisualSummary(data:CanonicalDataset,gaps:GapState,unit:Unit,year:number,projectId?:string){
 const active=new Map(effectiveProjectActivitySplits(data,gaps.projectActivitySplits??[],gaps.projectImportCompletions??[]).map(d=>[d.workloadId,d.developmentPercent]));
 const rows=projectAllocationRows(data).filter(r=>kindMetrics[unit].includes(r.metric)&&(year===0||r.year===year)&&
  r.scope.axis==='project'&&(!projectId||r.scope.projectId===projectId));
 let development=0,maintenance=0,unallocated=0;
 for(const row of rows){
  const pct=active.get(row.workloadId);
  if(pct===undefined){unallocated+=row.value;continue}
  development+=row.value*pct/100;
  maintenance+=row.value*(100-pct)/100;
 }
 return {development,maintenance,unallocated,total:development+maintenance+unallocated,complete:rows.length>0&&rows.every(r=>active.has(r.workloadId))};
}

function ProjectDistributionIndicator({data,gaps,unit,year,projectId}:{data:CanonicalDataset;gaps:GapState;unit:Unit;year:number;projectId?:string}){
 const values=projectAllocationVisualSummary(data,gaps,unit,year,projectId);
 if(!values.total)return null;
 const pct=(n:number)=>100*n/values.total;
 const fmt=(n:number)=>n.toLocaleString('sv-SE',{maximumFractionDigits:1});
 return <div aria-label="Projektfördelning" role="group">
  <div role="img" aria-label={`Utveckling: ${fmt(values.development)}, Förvaltning: ${fmt(values.maintenance)}, ofördelat: ${fmt(values.unallocated)}`}
   style={{display:'flex',width:'100%',height:14,overflow:'hidden',borderRadius:8,background:'#e2e8f0',marginTop:8}}>
   <span style={{width:pct(values.development)+'%',background:'#2563eb'}}/>
   <span style={{width:pct(values.maintenance)+'%',background:'#0d9488'}}/>
  </div>
  <p><small>Utveckling: {fmt(values.development)} · Förvaltning: {fmt(values.maintenance)} · Ofördelat: {fmt(values.unallocated)} {unit==='hours'?'h':'kr'}</small></p>
 </div>;
}

export default function ProjectAllocationsPanel({data,gaps,onSaved}:{data:CanonicalDataset;gaps:GapState;onSaved:(next:GapState)=>void}){
 const [expanded,setExpanded]=useState(false);
 const [selectedProject,setSelectedProject]=useState<string|null>(null);
 const [unit,setUnit]=useState<Unit>('hours');
 const [year,setYear]=useState(0);
 const years=[...new Set(projectAllocationRows(data).map(r=>r.year))].sort((a,b)=>a-b);
 const projects=projectAllocationOverview(data,gaps,unit,year);
 const chosen=projects.find(p=>p.id===selectedProject);
 if(!projectAllocationRows(data).length)return null;
 return <section className="panel" aria-label="Projektfördelningar">
  <button type="button" className="secondary" style={{width:'100%',textAlign:'left'}} aria-expanded={expanded}
   onClick={()=>setExpanded(v=>!v)}><strong>Utveckling / Förvaltning – projekt {expanded?'▾':'›'}</strong></button>
  {expanded&&<>
   <p>Projekt är separata från UO. Projektets utvecklings-/förvaltningsandel används automatiskt för projektdelar med komplett källfördelning. Du kan ändra varje projektdel, år och mått; den importerade totalen ändras inte. Saknas en komplett källfördelning lämnas behovet ofördelat.</p>
   <div className="mapping-grid">
    <label>Typ av behov <select aria-label="Projektfördelning måttyp" value={unit} onChange={e=>{setUnit(e.target.value as Unit);setSelectedProject(null)}}>
     <option value="hours">Timmar</option><option value="costs">Kronor</option>
    </select></label>
    <label>År <select aria-label="Projektfördelning år" value={year} onChange={e=>setYear(Number(e.target.value))}>
     <option value={0}>Alla år</option>{years.map(y=><option key={y} value={y}>{y}</option>)}
    </select></label>
   </div>
   {chosen&&<button type="button" className="secondary" onClick={()=>setSelectedProject(null)}>← Alla projekt</button>}
   {!projects.length?<p>Inga projektvärden för valt mått och år.</p>:!chosen?
    <section aria-label="Välj projekt att fördela">
     {projects.map(project=><button key={project.id} type="button" className="panel" style={{display:'block',width:'100%',textAlign:'left',marginTop:8}}
      onClick={()=>setSelectedProject(project.id)}>
      <strong>{label(project.id)} ›</strong>
      <p>{project.allocated} av {project.records} fördelningar klara · {project.records-project.allocated} återstår</p>
      <ProjectDistributionIndicator data={data} gaps={gaps} unit={unit} year={year} projectId={project.id}/>
     </button>)}
    </section>:
    <section aria-label={'Fördelningar för '+label(chosen.id)}>
     <h3>{label(chosen.id)}</h3>
     <p>{chosen.allocated} av {chosen.records} fördelningar klara för valt urval.</p>
     <ProjectDistributionIndicator data={data} gaps={gaps} unit={unit} year={year} projectId={chosen.id}/>
     <ProjectActivityEditor data={data} state={gaps} projectId={chosen.id} year={year===0?undefined:year} metrics={kindMetrics[unit]} onSaved={onSaved}/>
    </section>}
  </>}
 </section>;
}
