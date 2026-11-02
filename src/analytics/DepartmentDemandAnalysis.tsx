import {useState} from 'react';
import type {UoGroupModel} from './groupModels';
import type {DepartmentDemandObservation} from '../domain/semantic';
import {analyzeDepartmentDemand} from '../domain/departmentDemandAnalysis';
import {departmentDemandDrilldown} from '../domain/departmentDemandDrilldown';
import DepartmentDemandBreakdown from './DepartmentDemandBreakdown';

export default function DepartmentDemandAnalysis({records,year,metrics,groupModel}:{records:readonly DepartmentDemandObservation[];year?:number;metrics:readonly ('it_hours'|'business_hours')[];groupModel?:UoGroupModel}){
 const [selectedId,setSelectedId]=useState<string|null>(null);
 const result=analyzeDepartmentDemand(records,{perspective:'department',year,metrics,groupModel});
 const selected=result.rows.find(row=>row.id===selectedId);
 const detail=selected?departmentDemandDrilldown(records,{perspective:'department',id:selected.id,year,metrics}):[];
 return <section className="panel department-demand-analysis" aria-label="Avdelningsbehov">
  <h3>Resursbehov per avdelning</h3>
  <p>Samtliga UO:s efterfrågade timmar från respektive avdelning. Avdelningarnas referenskoder visas inte. Dessa timmar är inte ett tillägg till UO-budgeten.</p>
  <DepartmentDemandBreakdown title="Efterfrågade timmar per avdelning" rows={result.rows} onSelect={id=>setSelectedId(old=>old===id?null:id)}/>
  {selected&&<section className="panel" aria-label="Fördjupning av avdelningsbehov">
   <button type="button" className="secondary" onClick={()=>setSelectedId(null)}>Tillbaka till avdelningar</button>
   <DepartmentDemandBreakdown title={'Efterfrågande UO – '+selected.label} rows={detail}/>
  </section>}
 </section>;
}
