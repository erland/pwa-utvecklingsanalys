import DepartmentDemandTrend from './DepartmentDemandTrend';
import {useState} from 'react';
import type {PlanningScope} from './PlanningScopeAnalysis';
import type {UoGroupModel} from './groupModels';
import type {DepartmentDemandObservation} from '../domain/semantic';
import {analyzeDepartmentDemand} from '../domain/departmentDemandAnalysis';
import {departmentDemandDrilldown} from '../domain/departmentDemandDrilldown';
import DepartmentDemandBreakdown from './DepartmentDemandBreakdown';

export default function DepartmentDemandAnalysis({records,year,metrics,groupModel,planningType='all'}:{records:readonly DepartmentDemandObservation[];year?:number;metrics:readonly ('it_hours'|'business_hours')[];groupModel?:UoGroupModel;planningType?:PlanningScope}){
 const shown=records.filter(r=>planningType==='all'||(r.planningType??'uo')===planningType);
 const [selectedId,setSelectedId]=useState<string|null>(null);
 const result=analyzeDepartmentDemand(shown,{perspective:'department',year,metrics,groupModel});
 // A stale department selection must not be expanded when the shared filter excludes it.
 const selected=result.rows.find(row=>row.id===selectedId);
 const detail=selected?departmentDemandDrilldown(shown,{perspective:'department',id:selected.id,year,metrics}):[];
 return <section className="panel department-demand-analysis" aria-label="Avdelningsbehov">
  <h3>Resursbehov per avdelning</h3>
  <p>Efterfrågade avdelningstimmar från UO och tvärgående projekt. Avdelningarnas referenskoder visas inte. Uppgifterna är en alternativ fördelning av budgetbehoven och adderas inte till UO- eller projekttotalen.</p>
  <p><strong>Planering:</strong> {planningType==='all'?'Alla – UO och projekt':planningType==='uo'?'UO':'Projekt'}</p>
  <DepartmentDemandBreakdown title="Efterfrågade timmar per avdelning" rows={result.rows} onSelect={id=>setSelectedId(old=>old===id?null:id)}/>
  <DepartmentDemandTrend records={shown} metrics={metrics} selectedDepartment={selected?.id}/>
  {selected&&<section className="panel" aria-label="Fördjupning av avdelningsbehov">
   <button type="button" className="secondary" onClick={()=>setSelectedId(null)}>Tillbaka till avdelningar</button>
   <DepartmentDemandBreakdown title={'Efterfrågande UO och projekt – '+selected.label} rows={detail} showPlanningType/>
  </section>}
 </section>;
}
