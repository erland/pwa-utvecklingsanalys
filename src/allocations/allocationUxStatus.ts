import type {AllocationPreview,ActivityAllocationDecision} from '../domain/activityAllocation';

export type AllocationGroupPreview={previews:AllocationPreview[]};

/** UI-only explanation; editing and persistence still use the validated allocation engine. */
export function loAllocationStatus(groups:readonly AllocationGroupPreview[],loId:string,decisions:readonly ActivityAllocationDecision[]){
 const previews=groups.flatMap(g=>g.previews).filter(p=>p.items.some(i=>i.loId===loId));
 const locked=previews.some(p=>p.lockedLo?.some(l=>l.loId===loId));
 const saved=previews.map(p=>decisions.find(d=>d.ruleId===p.ruleId&&d.fingerprint===p.fingerprint)).filter((d):d is ActivityAllocationDecision=>Boolean(d));
 const adjusted=saved.some(d=>d.overrides?.some(o=>o.loId===loId));
 if(locked)return {label:'Importerad · låst',description:'Andelen kommer från Excelunderlaget och kan inte ändras här.'};
 if(adjusted)return {label:'Manuellt justerad · sparad',description:'Denna LO har en sparad egen andel. Övriga redigerbara LO balanseras mot UO:s totalsumma.'};
 if(saved.length)return {label:'Sparad fördelning',description:'Andelen ingår i en sparad fördelning. Den kan justeras där källvärdena tillåter det.'};
 return {label:'Automatiskt föreslagen',description:'Andelen beräknas utifrån UO:s importerade fördelning och kan justeras där källvärdena tillåter det.'};
}

/** Mirrors the existing bulk rejection of mixed locks. Does not predict feasibility beyond locks. */
export function loBulkImpact(groups:readonly AllocationGroupPreview[]){
 const previews=groups.flatMap(g=>g.previews);
 const editable=new Set<string>(),locked=new Set<string>();
 let mixedLocks=false;
 for(const preview of previews){
  const all=new Set(preview.items.map(i=>i.loId));
  const fixed=new Set((preview.lockedLo??[]).map(i=>i.loId));
  const hasEditable=[...all].some(id=>!fixed.has(id));
  if(hasEditable&&fixed.size>0)mixedLocks=true;
  for(const id of all)(fixed.has(id)?locked:editable).add(id);
 }
 const canApply=previews.length>0&&!mixedLocks&&editable.size>0;
 return {editableLo:editable.size,lockedLo:locked.size,groups:previews.length,mixedLocks,canApply,
  explanation:mixedLocks?'Massändringen kan inte genomföras eftersom samma UO-underlag innehåller både importerade, låsta och redigerbara LO.':
   !editable.size?'Alla LO i de valda underlagen är importerade och låsta. Ingen massändring kan göras.':
   'De redigerbara LO sätts till UO:s importerade andel. Tidigare egna LO-justeringar för berörda år ersätts; importerade värden förblir låsta.'};
}
