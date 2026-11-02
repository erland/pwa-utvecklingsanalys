import {departmentDemandDrilldown} from '../domain/departmentDemandDrilldown';
import type {UoGroupModel} from './groupModels';
import {useMemo,useState} from 'react';
import type {DepartmentDemandObservation} from '../domain/semantic';
import {analyzeDepartmentDemand} from '../domain/departmentDemandAnalysis';

export default function DepartmentDemandAnalysis({records,year,metrics,groupModel}:{records:readonly DepartmentDemandObservation[];year?:number;metrics:readonly ('it_hours'|'business_hours')[];groupModel?:UoGroupModel}){
 const [scope,setScope]=useState('all');
 const uos=useMemo(()=>[...new Set(records.map(r=>r.uoId))].sort(),[records]);
 const [perspective,setPerspective]=useState<'department'|'uo'>('department');
 const [selectedId,setSelectedId]=useState<string|null>(null);
 const analysis=useMemo(()=>analyzeDepartmentDemand(records,{perspective,year,metrics,groupModel,scope:scope==='all'?{level:'all'}:scope.startsWith('group:')?{level:'group',id:scope.slice(6)}:{level:'uo',id:scope.slice(3)}}),[records,perspective,year,metrics,groupModel,scope]);
 const currentScope=scope==='all'?{level:'all' as const}:scope.startsWith('group:')?{level:'group' as const,id:scope.slice(6)}:{level:'uo' as const,id:scope.slice(3)};
 const selected=analysis.rows.find(row=>row.id===selectedId);
 const detail=selected?departmentDemandDrilldown(records,{perspective,id:selected.id,year,metrics,scope:currentScope,groupModel}):[];
 const fmt=(n:number)=>n.toLocaleString('sv-SE',{maximumFractionDigits:2});
 return <section className="panel department-demand-analysis" aria-label="Avdelningsbehov">
  <h3>Avdelningarnas efterfrågade timmar</h3>
  <p>Separat fördelning av UO:s timbehov från bladet Timmar per avdelning. Värdena läggs inte till UO-budgetens totalsummor. Differenser mot budgeten ändrar inte avdelningsbehovet.</p>
  <label>Organisationsurval <select aria-label="UO-urval för avdelningsbehov" value={scope} onChange={e=>{setScope(e.target.value);setSelectedId(null)}}><option value="all">Alla UO</option>{groupModel?.groups.map(g=><option key={g.id} value={'group:'+g.id}>{'UO-grupp: '+g.name}</option>)}{groupModel&&<option value="group:unassigned">Ej grupperade UO</option>}{uos.map(id=><option key={id} value={'uo:'+id}>{'UO: '+decodeURIComponent(id.replace(/^uo:/,''))}</option>)}</select></label>
  <label>Visa efter <select aria-label="Perspektiv för avdelningsbehov" value={perspective} onChange={e=>{setPerspective(e.target.value as 'department'|'uo');setSelectedId(null)}}><option value="department">Avdelning</option><option value="uo">UO</option></select></label>
  {!records.length?<p>Inga avdelningsbehov har importerats från UO-filerna.</p>:!analysis.rows.length?<p>Inga avdelningstimmar för valt år och timmått.</p>:<>
   <p><strong>Summa efterfrågade timmar: {fmt(analysis.total)} h</strong> (IT: {fmt(analysis.itHours)} h, verksamhet: {fmt(analysis.businessHours)} h)</p>
   <div style={{overflowX:'auto'}}><table className="canonical-table" aria-label="Efterfrågade timmar per avdelning eller UO"><thead><tr><th>{perspective==='uo'?'UO':'Avdelning'}</th><th>IT-timmar</th><th>Verksamhetstimmar</th><th>Totalt</th></tr></thead><tbody>{analysis.rows.map(row=><tr key={row.id}><th scope="row"><button type="button" className="secondary" aria-expanded={selectedId===row.id} onClick={()=>setSelectedId(old=>old===row.id?null:row.id)}>{row.label}</button></th><td>{fmt(row.itHours)} h</td><td>{fmt(row.businessHours)} h</td><td>{fmt(row.total)} h</td></tr>)}</tbody></table></div>
   {selected&&<section className="panel" aria-label="Fördjupning av avdelningsbehov">
    <h4>{perspective==='department'?'UO som efterfrågar timmar från '+selected.label:'Avdelningar som UO '+selected.label+' efterfrågar timmar från'}</h4>
    <p>Fördjupningen använder samma år, timmått och organisationsurval som huvudtabellen.</p>
    <div style={{overflowX:'auto'}}><table className="canonical-table" aria-label="Fördjupade avdelningstimmar"><thead><tr><th>{perspective==='department'?'UO':'Avdelning'}</th><th>IT-timmar</th><th>Verksamhetstimmar</th><th>Totalt</th></tr></thead><tbody>
    {detail.map(row=><tr key={row.id}><th scope="row">{row.label}</th><td>{fmt(row.itHours)} h</td><td>{fmt(row.businessHours)} h</td><td>{fmt(row.total)} h</td></tr>)}
    </tbody></table></div>
   </section>}
  </>}
 </section>;
}
