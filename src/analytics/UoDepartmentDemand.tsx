import type {DepartmentDemandObservation} from '../domain/semantic';
import type {OrganizationSelection} from './organizationContext';
import type {UoGroupModel} from './groupModels';
import {analyzeDepartmentDemand} from '../domain/departmentDemandAnalysis';
import DepartmentDemandBreakdown from './DepartmentDemandBreakdown';

export default function UoDepartmentDemand({records,selection,groupModel,year,metrics}:{records:readonly DepartmentDemandObservation[];selection:OrganizationSelection;groupModel?:UoGroupModel;year?:number;metrics:readonly ('it_hours'|'business_hours')[]}){
 const scope=selection.level==='group'&&selection.groupId?{level:'group' as const,id:selection.groupId}:selection.uoId?{level:'uo' as const,id:selection.uoId}:{level:'all' as const};
 const result=analyzeDepartmentDemand(records,{perspective:'department',scope,groupModel,year,metrics});
 return <section className="panel" aria-label="Resursbehov per avdelning för UO">
  <h3>Resursbehov från avdelningarna</h3>
  <p>Efterfrågade avdelningstimmar för aktuellt UO-urval. Redovisas separat från UO-budgeten och adderas inte till budgettotalen.</p>
  <DepartmentDemandBreakdown title="Fördelning av efterfrågade avdelningstimmar" rows={result.rows}/>
 </section>;
}
