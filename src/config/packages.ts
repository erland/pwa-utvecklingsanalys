import type {Allocations} from '../allocations/model';
import {validateAllocation} from '../allocations/model';
import type {Mapping} from '../import/uoBudget';

export type PackageSection='allocations'|'mappings';
export interface ConfigPackage {
 format:'utvecklingsanalys-config';version:1;exportedAt:string;mode:'definitions-only'|'full-configuration';
 sections:{allocations?:Allocations;mappings?:Record<string,Mapping>};
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
 if(Object.keys(p.sections).some(k=>!['allocations','mappings'].includes(k)))throw new Error('UNSUPPORTED_SECTION');
 return p;
}
export function buildPackage(allocations:Allocations|undefined,mappings:Record<string,Mapping>|undefined,mode:ConfigPackage['mode']):ConfigPackage{
 return parsePackage({format:'utvecklingsanalys-config',version:1,exportedAt:new Date().toISOString(),mode,sections:{
  ...(allocations?{allocations:mode==='definitions-only'?{...allocations,rules:[]}:allocations}:{}),
  ...(mappings?{mappings}:{}),
 }});
}
export function conflicts(current:ConfigPackage, incoming:ConfigPackage):Conflict[]{
 const out:Conflict[]=[];
 const a=current.sections.allocations,b=incoming.sections.allocations;
 for(const d of b?.dimensions??[]){
  const old=a?.dimensions.find(x=>x.id===d.id||x.name.toLocaleLowerCase('sv-SE')===d.name.toLocaleLowerCase('sv-SE'));
  if(old&&JSON.stringify(old)!==JSON.stringify(d))out.push({section:'allocations',key:d.name,reason:'Definition med samma id eller namn skiljer sig'});
 }
 for(const [key,val] of Object.entries(incoming.sections.mappings??{})){
  const old=current.sections.mappings?.[key];
  if(old&&JSON.stringify(old)!==JSON.stringify(val))out.push({section:'mappings',key,reason:'Mallprofil med samma namn skiljer sig'});
 }
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
 const next=buildPackage(allocations,{...(current.sections.mappings??{}),...(incoming.sections.mappings??{})},'full-configuration');
 return next;
}
