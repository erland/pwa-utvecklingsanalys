import {useState} from 'react';
import type {CanonicalDataset,Metric} from '../domain/canonical';
import type {GapState} from '../gaps/store';
import ProjectActivityEditor from './ProjectActivityEditor';
import {activeProjectActivitySplits,projectAllocationRows} from './projectActivityAllocation';

type Unit='hours'|'costs';
const kindMetrics:Record<Unit,Metric[]>={hours:['it_hours','business_hours'],costs:['consultant_cost','other_cost']};
const label=(id:string)=>{try{return decodeURIComponent(id.slice('project:'.length))}catch{return id}};

/** Projects use the same stored decisions as the analysis; there is no parallel allocation model. */
export function projectAllocationOverview(data:CanonicalDataset,gaps:GapState,unit:Unit,year:number){
 const rows=projectAllocationRows(data).filter(r=>kindMetrics[unit].includes(r.metric)&&(year===0||r.year===year));
 const active=new Set(activeProjectActivitySplits(data,gaps.projectActivitySplits??[]).map(d=>d.workloadId));
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
   <p>Projekt är separata från UO. Ange Utveckling per projektdel, år och mått; den importerade totalen ändras inte. Saknad fördelning är okänd, inte noll.</p>
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
     </button>)}
    </section>:
    <section aria-label={'Fördelningar för '+label(chosen.id)}>
     <h3>{label(chosen.id)}</h3>
     <p>{chosen.allocated} av {chosen.records} fördelningar klara för valt urval.</p>
     <ProjectActivityEditor data={data} state={gaps} projectId={chosen.id} year={year===0?undefined:year} metrics={kindMetrics[unit]} onSaved={onSaved}/>
    </section>}
  </>}
 </section>;
}
