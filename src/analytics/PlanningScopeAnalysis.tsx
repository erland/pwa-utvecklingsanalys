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

export default function PlanningScopeAnalysis({data,state,scope,metrics,year}:{data:CanonicalDataset;state:GapState;scope:PlanningScope;metrics:Metric[];year?:number}){
 const [activity,setActivity]=useState<'all'|'development'|'maintenance'>('all');
 const [openProject,setOpenProject]=useState<string|null>(null);
 const [openUo,setOpenUo]=useState<string|null>(null);
 if(!metrics.length)return <p>Välj minst ett mått.</p>;
 let totals:ReturnType<typeof planningTotals>;
 try{totals=planningTotals(data,state,metrics,year,activity)}catch(error){return <p role="alert">Kunde inte visa planeringsbehov: {String(error)}</p>}
 const includeUo=scope!=='project',includeProjects=scope!=='uo';
 const rows=[
  ...(includeUo?totals.uo.rows.map(row=>({...row,kind:'UO' as const})):[]),
  ...(includeProjects?totals.projects.rows.map(row=>({...row,kind:'Projekt' as const})):[])
 ];
 const total=(includeUo?totals.uo.total:0)+(includeProjects?totals.projects.total:0);
 const unit=totals.unit;
 const parts=(projectId:string)=>analyzeCanonical(data,state,{axis:'project',metrics,activity,year}).rows
  .filter(row=>data.records.some(record=>record.scope.axis==='project'&&record.scope.projectId===projectId&&record.scope.partId===row.key));
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
    <td>{fmt(row.value)} {unit}</td>
   </tr>)}</tbody>
  </table></div>
  {rows.filter(row=>row.kind==='Projekt'&&openProject===row.key).map(row=><section key={row.key} className="panel" aria-label={'Projektdelar '+decode(row.key)}>
   <h4>{decode(row.key)} – projektdelar</h4>
   <table className="canonical-table"><thead><tr><th>Del</th><th>Behov</th></tr></thead><tbody>
    {parts(row.key).map(part=><tr key={part.key}><th scope="row">{decode(part.key)}</th><td>{fmt(part.value)} {unit}</td></tr>)}
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
