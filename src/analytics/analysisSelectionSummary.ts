import type {Activity,Metric,ReportingAxis} from '../domain/canonical';
import type {UoGroupModel} from './groupModels';
import type {OrganizationSelection} from './organizationContext';

const metricNames:Record<Metric,string>={
 it_hours:'IT-timmar',business_hours:'Verksamhetstimmar',
 consultant_cost:'Konsultkostnader',other_cost:'Övriga kostnader'
};
const entityName=(id:string)=>{const raw=id.startsWith('uo:')?id.slice(3):id;try{return decodeURIComponent(raw)}catch{return raw}};

/** Presentation only: mirror the same filter values already used by canonicalQuery. */
export function analysisSelectionSummary(input:{
 axis:ReportingAxis;unit:'hours'|'costs';metrics:readonly Metric[];
 activity:Activity|'all'|'allocated';year:string;organization:OrganizationSelection;
 groupModel?:UoGroupModel;
}):{organization:string;measure:string;activity?:string;year:string}{
 const {axis,unit,metrics,activity,year,organization,groupModel}=input;
 let scope='Alla UO';
 if(axis==='department')scope='Avdelningar';
 else if(organization.level==='groups')scope=groupModel?'UO-grupper':'Alla UO (gruppmodell saknas)';
 else if(organization.level==='group')scope='UO-grupp: '+(groupModel?.groups.find(g=>g.id===organization.groupId)?.name??'Ej grupperad');
 else if(organization.level==='uo'||organization.level==='part'){
  scope='UO: '+entityName(organization.uoId??'');
  if(organization.level==='part'&&organization.partId)scope+=' · LO/del: '+entityName(organization.partId);
 }
 return {
  organization:scope,
  measure:(unit==='costs'&&axis==='work'?'Kostnader':'Timmar')+' · '+(metrics.length?metrics.map(m=>metricNames[m]).join(' + '):'Inget mått valt'),
  activity:axis==='work'&&(unit==='hours'||activity!=='all')?(activity==='all'?'Utveckling och förvaltning':activity==='development'?'Utveckling':activity==='maintenance'?'Förvaltning':'Fördelade aktiviteter'):undefined,
  year:year==='all'?'Alla år':year
 };
}
