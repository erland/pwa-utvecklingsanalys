import type {UoGroupModel} from '../analytics/groupModels';
import {groupForUo} from '../analytics/groupModels';
import type {DepartmentDemandObservation} from './semantic';

/** Presentation-only cleanup. Preserve the department code as its stable internal identity. */
export function departmentDisplayName(value:string):string{
 return value.trim().replace(/^[\s\u2022\u00b7\-–—]+/u,'').trim();
}
export type DepartmentDemandRow={id:string;label:string;itHours:number;businessHours:number;total:number};
export type DepartmentDemandAnalysis={rows:DepartmentDemandRow[];total:number;itHours:number;businessHours:number};

/** Alternative view over imported UO->department demand, never added to canonical budget. */
export function analyzeDepartmentDemand(records:readonly DepartmentDemandObservation[],options:{perspective:'department'|'uo';year?:number;metrics:readonly ('it_hours'|'business_hours')[];scope?:{level:'all'|'group'|'uo';id?:string};planningType?:'all'|'uo'|'project';groupModel?:UoGroupModel}):DepartmentDemandAnalysis{
 const groups=new Map<string,DepartmentDemandRow>();
 for(const d of records){
  if(options.year!==undefined&&d.year!==options.year||!options.metrics.includes(d.metric))continue;
  if(options.planningType&&options.planningType!=='all'&&(d.planningType??'uo')!==options.planningType)continue;
  if(options.scope?.level==='uo'&&d.uoId!==options.scope.id)continue;
  if(options.scope?.level==='group'&&(d.planningType==='project'||groupForUo(options.groupModel??{id:'',name:'',groups:[]},d.uoId)?.id??'unassigned')!==options.scope.id)continue;
  const id=options.perspective==='uo'?d.uoId:(d.departmentCode||d.departmentName.trim().toLocaleLowerCase('sv-SE'));
  const label=options.perspective==='uo'?decodeURIComponent(d.uoId.replace(/^(?:uo|project):/,'')):departmentDisplayName(d.departmentName);
  const prior=groups.get(id)??{id,label,itHours:0,businessHours:0,total:0};
  if(d.metric==='it_hours')prior.itHours+=d.hours;else prior.businessHours+=d.hours;
  prior.total+=d.hours;groups.set(id,prior);
 }
 const rows=[...groups.values()].sort((a,b)=>b.total-a.total||a.label.localeCompare(b.label,'sv'));
 return {rows,total:rows.reduce((sum,r)=>sum+r.total,0),itHours:rows.reduce((sum,r)=>sum+r.itHours,0),businessHours:rows.reduce((sum,r)=>sum+r.businessHours,0)};
}
