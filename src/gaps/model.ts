import type {SemanticDataset} from '../domain/semantic';
export type InformationRequirement={id:string;name:string;measureId:string;entityKind:'uo'|'lo'|'process'|'department';years:number[];activities:string[];required:boolean};
export type GapResolution={key:string;status:'manual'|'not-applicable'|'unknown';value?:number;reason:string;updatedAt:string};
export type InformationGap={key:string;requirementId:string;entityId:string;entityName:string;year:number;activity:string;status:'missing'|'manual'|'not-applicable'|'unknown';value?:number;reason?:string};
export const gapKey=(requirementId:string,entityId:string,year:number,activity:string)=>JSON.stringify([requirementId,entityId,year,activity]);
export function validateRequirement(x:InformationRequirement,data:SemanticDataset):string[]{
 const errors:string[]=[];
 if(!x.name.trim()||!x.id.trim())errors.push('Namn och ID krävs');
 if(!data.measures.some(m=>m.id===x.measureId))errors.push('Okänt mått');
 if(!x.years.length||x.years.some(y=>!Number.isInteger(y)||y<2000||y>2100))errors.push('Ogiltiga år');
 if(!x.activities.length||x.activities.some(a=>!a.trim())||new Set(x.activities).size!==x.activities.length)errors.push('Ogiltiga aktiviteter');
 return errors;
}
export function findInformationGaps(data:SemanticDataset,requirements:InformationRequirement[],resolutions:GapResolution[]):InformationGap[]{
 const saved=new Map(resolutions.map(r=>[r.key,r])),out:InformationGap[]=[];
 for(const req of requirements){
  if(!req.required)continue;
  for(const entity of data.entities.filter(e=>e.kind===req.entityKind)){
   for(const year of req.years)for(const activity of req.activities){
    const matched=data.observations.some(o=>o.entityId===entity.id&&o.measureId===req.measureId&&o.period.year===year&&(o.activity??'')===activity);
    if(matched)continue;
    const key=gapKey(req.id,entity.id,year,activity),resolution=saved.get(key);
    out.push({key,requirementId:req.id,entityId:entity.id,entityName:entity.name,year,activity,status:resolution?.status??'missing',value:resolution?.value,reason:resolution?.reason});
   }
  }
 }
 return out;
}
export function validateResolution(r:GapResolution):string[]{
 const errors:string[]=[];
 if(!r.key)errors.push('Nyckel saknas');
 if(r.status==='manual'&&(!Number.isFinite(r.value)||r.value===undefined))errors.push('Ett ändligt värde krävs');
 if(r.status!=='manual'&&r.value!==undefined)errors.push('Värde får endast anges manuellt');
 if(r.status==='not-applicable'&&!r.reason.trim())errors.push('Motivering krävs');
 return errors;
}
