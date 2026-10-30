import {optionalAllocationKey,parseOptionalAllocations,type OptionalAllocations} from '../allocations/optionalModel';
import {validateGroupModels,type UoGroupModel} from '../analytics/groupModels';
import type {Allocations} from '../allocations/model';
import {validateAllocation} from '../allocations/model';
import type {Mapping} from '../import/uoBudget';

export type PackageSection='allocations'|'optionalAllocations'|'mappings'|'groups';
export interface ConfigPackage {
 format:'utvecklingsanalys-config';version:1;exportedAt:string;mode:'definitions-only'|'full-configuration';
 sections:{allocations?:Allocations;mappings?:Record<string,Mapping>;groups?:UoGroupModel[];optionalAllocations?:OptionalAllocations};
 activeGroupModelId?:string;
}
export type Conflict={section:PackageSection;key:string;reason:string};
export function parsePackage(input:unknown):ConfigPackage{
 if(!input||typeof input!=='object')throw new Error('INVALID_PACKAGE');
 const p=input as ConfigPackage;
 if(p.format!=='utvecklingsanalys-config'||p.version!==1)throw new Error('UNSUPPORTED_PACKAGE_VERSION');
 if(!p.sections||typeof p.sections!=='object'||Array.isArray(p.sections)||!['definitions-only','full-configuration'].includes(p.mode))throw new Error('INVALID_PACKAGE');
 if(p.sections.allocations){
  const a=p.sections.allocations;
  if(a.schemaVersion!==1||!Array.isArray(a.dimensions)||!Array.isArray(a.rules))throw new Error('INVALID_ALLOCATIONS');
  if(validateAllocation(a).length)throw new Error('INVALID_ALLOCATIONS');
  if(p.mode==='definitions-only'&&a.rules.length)throw new Error('DEFINITIONS_PACKAGE_HAS_RULES');
 }
 if(p.sections.mappings){
  if(typeof p.sections.mappings!=='object'||Array.isArray(p.sections.mappings))throw new Error('INVALID_MAPPINGS');
  for(const m of Object.values(p.sections.mappings)){
   if(!m||typeof m.sheet!=='string'||!m.sheet.trim()||typeof m.uoCell!=='string'||!m.uoCell.trim()||!['headerRow','areaColumn','labelColumn','startRow'].every(k=>Number.isInteger(m[k as keyof Mapping])&&Number(m[k as keyof Mapping])>0))throw new Error('INVALID_MAPPING');
  }
 }
 if(p.sections.groups)validateGroupModels(p.sections.groups);
 if(p.sections.optionalAllocations){parseOptionalAllocations(p.sections.optionalAllocations);if(p.mode==='definitions-only'&&p.sections.optionalAllocations.rules.length)throw new Error('DEFINITIONS_PACKAGE_HAS_RULES')}
 if(p.activeGroupModelId!==undefined&&(typeof p.activeGroupModelId!=='string'||!p.sections.groups?.some(m=>m.id===p.activeGroupModelId)))throw new Error('INVALID_ACTIVE_GROUP_MODEL');
 if(Object.keys(p.sections).some(k=>!['allocations','optionalAllocations','mappings','groups'].includes(k)))throw new Error('UNSUPPORTED_SECTION');
 return p;
}
export function buildPackage(allocations:Allocations|undefined,mappings:Record<string,Mapping>|undefined,mode:ConfigPackage['mode'],groups?:UoGroupModel[],optionalAllocations?:OptionalAllocations):ConfigPackage{
 return parsePackage({format:'utvecklingsanalys-config',version:1,exportedAt:new Date().toISOString(),mode,sections:{
  ...(allocations?{allocations:mode==='definitions-only'?{...allocations,rules:[]}:allocations}:{}),
  ...(mappings?{mappings}:{}),
  ...(groups?{groups}:{}),
  ...(optionalAllocations?{optionalAllocations:mode==='definitions-only'?{...optionalAllocations,rules:[]}:optionalAllocations}:{}),
 }});
}
export function conflicts(current:ConfigPackage, incoming:ConfigPackage):Conflict[]{
 const out:Conflict[]=[];
 const a=current.sections.allocations,b=incoming.sections.allocations;
 for(const d of b?.dimensions??[]){
  const old=a?.dimensions.find(x=>x.id===d.id||x.name.toLocaleLowerCase('sv-SE')===d.name.toLocaleLowerCase('sv-SE'));
  if(old&&JSON.stringify(old)!==JSON.stringify(d))out.push({section:'allocations',key:d.name,reason:'Definition med samma id eller namn skiljer sig'});
 }
 for(const dimension of incoming.sections.optionalAllocations?.dimensions??[]){
  const old=current.sections.optionalAllocations?.dimensions.find(d=>d.id===dimension.id||d.name.toLocaleLowerCase('sv-SE')===dimension.name.toLocaleLowerCase('sv-SE'));
  if(old&&JSON.stringify(old)!==JSON.stringify(dimension))out.push({section:'optionalAllocations',key:dimension.name,reason:'Fördelningstyp med samma id eller namn skiljer sig'});
 }
 for(const [key,val] of Object.entries(incoming.sections.mappings??{})){
  const old=current.sections.mappings?.[key];
  if(old&&JSON.stringify(old)!==JSON.stringify(val))out.push({section:'mappings',key,reason:'Mallprofil med samma namn skiljer sig'});
 }
 for(const model of incoming.sections.groups??[]){const old=current.sections.groups?.find(x=>x.id===model.id||x.name.toLocaleLowerCase('sv-SE')===model.name.toLocaleLowerCase('sv-SE'));if(old&&JSON.stringify(old)!==JSON.stringify(model))out.push({section:'groups',key:model.name,reason:'Gruppmodell med samma id eller namn skiljer sig'});}
 return out;
}
export function mergedPackage(current:ConfigPackage,incoming:ConfigPackage,policy:'reject'|'replace'):ConfigPackage{
 const conflictsFound=conflicts(current,incoming);if(policy==='reject'&&conflictsFound.length)throw new Error('CONFLICTS_REQUIRE_RESOLUTION');
 const ca=current.sections.allocations,ia=incoming.sections.allocations;
 let allocations=ca;
 if(ia){
  const ids=new Set(ia.dimensions.map(x=>x.id));
  const names=new Set(ia.dimensions.map(x=>x.name.toLocaleLowerCase('sv-SE')));
  const dimensions=[...(ca?.dimensions??[]).filter(d=>!ids.has(d.id)&&!names.has(d.name.toLocaleLowerCase('sv-SE'))),...ia.dimensions];
  const rules=incoming.mode==='definitions-only'?(ca?.rules??[]):[
   ...(ca?.rules??[]).filter(r=>!ia.rules.some(x=>x.dimensionId===r.dimensionId&&x.entityId===r.entityId&&x.year===r.year)),...ia.rules
  ];
  allocations={schemaVersion:1,dimensions,rules};
 }
 const optionalCurrent=current.sections.optionalAllocations,optionalIncoming=incoming.sections.optionalAllocations;
 const optionalAllocations=optionalIncoming?{
  schemaVersion:2 as const,
  dimensions:[
   ...(optionalCurrent?.dimensions??[]).filter(d=>!optionalIncoming.dimensions.some(x=>x.id===d.id||x.name.toLocaleLowerCase('sv-SE')===d.name.toLocaleLowerCase('sv-SE'))),
   ...optionalIncoming.dimensions
  ],
  rules:incoming.mode==='definitions-only'?(optionalCurrent?.rules??[]):[
   ...(optionalCurrent?.rules??[]).filter(r=>!optionalIncoming.rules.some(x=>optionalAllocationKey(x)===optionalAllocationKey(r))),
   ...optionalIncoming.rules
  ]
 }:optionalCurrent;
 const groups=[...(current.sections.groups??[]).filter(g=>!(incoming.sections.groups??[]).some(x=>x.id===g.id||x.name.toLocaleLowerCase('sv-SE')===g.name.toLocaleLowerCase('sv-SE'))),...(incoming.sections.groups??[])];
 const next=buildPackage(allocations,{...(current.sections.mappings??{}),...(incoming.sections.mappings??{})},'full-configuration',groups,optionalAllocations);
 const activeGroupModelId=incoming.activeGroupModelId??current.activeGroupModelId;
 return activeGroupModelId&&groups.some(m=>m.id===activeGroupModelId)?parsePackage({...next,activeGroupModelId}):next;
}

/** Copies rules as a proposal for a new year, never replacing explicit target-year rules. */
export function proposeYear(a:Allocations,fromYear:number,toYear:number):Allocations{
 if(!Number.isInteger(fromYear)||!Number.isInteger(toYear)||fromYear===toYear||toYear<2000||toYear>2100)throw new Error('INVALID_YEAR');
 const rules=[...a.rules];const present=new Set(rules.map(r=>[r.dimensionId,r.entityId,r.year].join('|')));
 for(const rule of a.rules.filter(r=>r.year===fromYear)){
  const key=[rule.dimensionId,rule.entityId,toYear].join('|');
  if(!present.has(key)){rules.push({...rule,year:toYear,source:'Proposed from '+fromYear});present.add(key)}
 }
 const next={...a,rules};if(validateAllocation(next).length)throw new Error('INVALID_PROPOSAL');return next;
}
