import type {DepartmentDemandObservation} from './semantic';
import type {UoGroupModel} from '../analytics/groupModels';
import {analyzeDepartmentDemand,type DepartmentDemandRow} from './departmentDemandAnalysis';
import {groupForUo} from '../analytics/groupModels';

export function departmentDemandDrilldown(records:readonly DepartmentDemandObservation[],options:{
 perspective:'department'|'uo';id:string;year?:number;metrics:readonly ('it_hours'|'business_hours')[];
 scope?:{level:'all'|'group'|'uo';id?:string};planningType?:'all'|'uo'|'project';groupModel?:UoGroupModel;
}):DepartmentDemandRow[]{
 const filtered=records.filter(d=>{
  if(options.year!==undefined&&d.year!==options.year||!options.metrics.includes(d.metric))return false;
  if(options.planningType&&options.planningType!=='all'&&(d.planningType??'uo')!==options.planningType)return false;
  if(options.scope?.level==='uo'&&d.uoId!==options.scope.id)return false;
  if(options.scope?.level==='group'&&(d.planningType==='project'||(groupForUo(options.groupModel??{id:'',name:'',groups:[]},d.uoId)?.id??'unassigned')!==options.scope.id))return false;
  return options.perspective==='department'?(d.departmentCode||d.departmentName.trim().toLocaleLowerCase('sv-SE'))===options.id:d.uoId===options.id;
 });
 return analyzeDepartmentDemand(filtered,{perspective:options.perspective==='department'?'uo':'department',year:options.year,metrics:options.metrics}).rows;
}
