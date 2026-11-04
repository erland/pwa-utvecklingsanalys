import {useState} from 'react';
import type {CanonicalDataset,Metric} from '../domain/canonical';
import type {GapState} from '../gaps/store';
import {analyzeCanonical} from './canonicalQuery';

export type PlanningScope='all'|'uo'|'project';
const decode=(id:string)=>{try{return decodeURIComponent(id.split(':').at(-1)??id)}catch{return id}};
const fmt=(value:number)=>value.toLocaleString('sv-SE',{maximumFractionDigits:2});

/** Work and project source volumes are independent, additive planning requirements. */
export function planningTotals(data:CanonicalDataset,state:GapState,metrics:Metric[],year?:number,activity:'all'|'development'|'maintenance'='all'){
 const common={metrics,activity,year,organizationLevel:'uo' as const};
 const uo=analyzeCanonical(data,state,{...common,axis:'work'});
 const projects=analyzeCanonical(data,state,{...common,axis:'project'});
 return {uo,projects,total:uo.total+projects.total,unit:uo.unit};
}

type ActivitySelection='all'|'development'|'maintenance';
type VisiblePlanningRow={key:string;label:string;kind:'UO'|'Projekt';value:number|undefined;unallocated:number};
/** Always retain source planning objects even when their activity split is unknown. */
export function visiblePlanningRows(data:CanonicalDataset,state:GapState,metrics:Metric[],year:number|undefined,activity:ActivitySelection,scope:PlanningScope):VisiblePlanningRow[]{
 const all=planningTotals(data,state,metrics,year,'all');
 const selected=activity==='all'?all:planningTotals(data,state,metrics,year,activity);
 const missingUo=activity==='all'?[]:analyzeCanonical(data,state,{axis:'work',metrics,year,activity:'unknown',organizationLevel:'uo'}).rows;
 const missingProjects=activity==='all'?[]:analyzeCanonical(data,state,{axis:'project',metrics,year,activity:'unknown',organizationLevel:'uo'}).rows;
 return [
  ...(scope==='project'?[]:all.uo.rows.map(r=>({...r,kind:'UO' as const}))),
  ...(scope==='uo'?[]:all.projects.rows.map(r=>({...r,kind:'Projekt' as const})))
 ].map(r=>{
  const chosen=r.kind==='UO'?selected.uo.rows:selected.projects.rows;
  const missing=r.kind==='UO'?missingUo:missingProjects;
  return {key:r.key,label:r.label,kind:r.kind,value:chosen.find(v=>v.key===r.key)?.value,unallocated:missing.find(v=>v.key===r.key)?.value??0};
 });
}
/** Keep all project parts in the drill-down, including parts without a saved split. */
export function visibleProjectParts(data:CanonicalDataset,state:GapState,metrics:Metric[],year:number|undefined,activity:ActivitySelection,projectId:string){
 const query={axis:'project' as const,metrics,year};
 const all=analyzeCanonical(data,state,{...query,activity:'all'}).rows;
 const selected=activity==='all'?all:analyzeCanonical(data,state,{...query,activity}).rows;
 const missing=activity==='all'?[]:analyzeCanonical(data,state,{...query,activity:'unknown'}).rows;
 const ids=new Set(data.records.filter(r=>r.scope.axis==='project'&&r.scope.projectId===projectId).map(r=>r.scope.axis==='project'?r.scope.partId:''));
 return all.filter(r=>ids.has(r.key)).map(r=>({...r,value:selected.find(s=>s.key===r.key)?.value,unallocated:missing.find(s=>s.key===r.key)?.value??0}));
}

export default function PlanningScopeAnalysis({data,state,scope,metrics,year}:{data:CanonicalDataset;state:GapState;scope:PlanningScope;metrics:Metric[];year?:number}){
 const [activity,setActivity]=useState<'all'|'development'|'maintenance'>('all');
 const [openProject,setOpenProject]=useState<string|null>(null);
 const [openUo,setOpenUo]=useState<string|null>(null);
 if(!metrics.length)return <p>Välj minst ett mått.</p>;
 let totals:ReturnType<typeof planningTotals>;
 try{totals=planningTotals(data,state,metrics,year,activity)}catch(error){return <p role="alert">Kunde inte visa planeringsbehov: {String(error)}</p>}
 const includeUo=scope!=='project',includeProjects=scope!=='uo';
 const rows=visiblePlanningRows(data,state,metrics,year,activity,scope);
 const total=(includeUo?totals.uo.total:0)+(includeProjects?totals.projects.total:0);
 const unit=totals.unit;
 const parts=(projectId:string)=>visibleProjectParts(data,state,metrics,year,activity,projectId);
 const uoParts=(uoId:string)=>analyzeCanonical(data,state,{axis:'work',metrics,activity,year,detailUoId:uoId}).rows;
 return <section className="panel" aria-label="Samlat planeringsbehov">
  <h3>2. Planerade behov – {scope==='all'?'UO och projekt':scope==='uo'?'UO':'projekt'}</h3>
  <p>UO och projekt är separata underlag och summeras när båda är valda. Avdelningsfördelningar räknas inte en gång till.</p>
  <label>Aktivitet <select aria-label="Aktivitet för projekt och UO" value={activity} onChange={e=>setActivity(e.target.value as 'all'|'development'|'maintenance')}><option value="all">Totalt</option><option value="development">Utveckling</option><option value="maintenance">Förvaltning</option></select></label>
  {activity!=='all'&&(totals.uo.unknownCount+totals.projects.unknownCount)>0&&<p className="notice" role="status">{totals.uo.unknownCount+totals.projects.unknownCount} behov saknar en komplett aktivitetsfördelning och ingår inte i valt aktivitetsresultat.</p>}
  <p><strong>Totalt: {fmt(total)} {unit}</strong></p>
  {scope==='all'&&<table className="canonical-table" aria-label="Summering UO och projekt">
   <thead><tr><th>Typ</th><th>Behov</th></tr></thead>
   <tbody><tr><th scope="row">UO</th><td>{fmt(totals.uo.total)} {unit}</td></tr><tr><th scope="row">Projekt</th><td>{fmt(totals.projects.total)} {unit}</td></tr></tbody>
   <tfoot><tr><th scope="row">Totalt</th><td>{fmt(totals.total)} {unit}</td></tr></tfoot>
  </table>}
  <div style={{overflowX:'auto'}}><table className="canonical-table" aria-label="Planering per UO och projekt">
   <thead><tr><th>Typ</th><th>Planeringsobjekt</th><th>Behov</th></tr></thead>
   <tbody>{rows.map(row=><tr key={row.kind+row.key}>
    <td>{row.kind}</td>
    <th scope="row"><button type="button" className="secondary" aria-expanded={row.kind==='Projekt'?openProject===row.key:openUo===row.key}
     onClick={()=>row.kind==='Projekt'?setOpenProject(old=>old===row.key?null:row.key):setOpenUo(old=>old===row.key?null:row.key)}>
     {decode(row.key)}
    </button></th>
    <td>{row.value===undefined?'Ej fördelat':fmt(row.value)+' '+unit}{activity!=='all'&&row.unallocated>0&&<small> · Ofördelat: {fmt(row.unallocated)} {unit}</small>}</td>
   </tr>)}</tbody>
  </table></div>
  {rows.filter(row=>row.kind==='Projekt'&&openProject===row.key).map(row=><section key={row.key} className="panel" aria-label={'Projektdelar '+decode(row.key)}>
   <h4>{decode(row.key)} – projektdelar</h4>
   <table className="canonical-table"><thead><tr><th>Del</th><th>Behov</th></tr></thead><tbody>
    {parts(row.key).map(part=><tr key={part.key}><th scope="row">{decode(part.key)}</th><td>{part.value===undefined?'Ej fördelat':fmt(part.value)+' '+unit}{activity!=='all'&&part.unallocated>0&&<small> · Ofördelat: {fmt(part.unallocated)} {unit}</small>}</td></tr>)}
   </tbody></table>
  </section>)}
  {rows.filter(row=>row.kind==='UO'&&openUo===row.key).map(row=><section key={row.key} className="panel" aria-label={'LO per '+decode(row.key)}>
   <h4>{decode(row.key)} – LO och UO Övergripande</h4>
   <table className="canonical-table"><thead><tr><th>Del</th><th>Behov</th></tr></thead><tbody>
    {uoParts(row.key).map(part=><tr key={part.key}><th scope="row">{part.label}</th><td>{fmt(part.value)} {unit}</td></tr>)}
   </tbody></table>
  </section>)}
 </section>;
}
