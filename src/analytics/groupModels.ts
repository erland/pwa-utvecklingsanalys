/** User-defined group models contain references to UO ids, never copied observations. */
export type UoGroup={id:string;name:string;uoIds:string[]};
export type UoGroupModel={id:string;name:string;groups:UoGroup[]};
export function validateGroupModels(models:UoGroupModel[]):void{
 if(!Array.isArray(models))throw new Error('INVALID_GROUP_MODELS');
 const ids=new Set<string>(), names=new Set<string>();
 for(const model of models){
  if(!model||typeof model.id!=='string'||!model.id.trim()||typeof model.name!=='string'||!model.name.trim())throw new Error('INVALID_GROUP_MODEL');
  if(ids.has(model.id)||names.has(model.name.trim().toLocaleLowerCase('sv-SE')))throw new Error('DUPLICATE_GROUP_MODEL');
  ids.add(model.id);names.add(model.name.trim().toLocaleLowerCase('sv-SE'));
  if(!Array.isArray(model.groups))throw new Error('INVALID_GROUPS');
  const groupIds=new Set<string>(),groupNames=new Set<string>();
  for(const group of model.groups){
   if(!group||typeof group.id!=='string'||!group.id.trim()||typeof group.name!=='string'||!group.name.trim()||!Array.isArray(group.uoIds)||group.uoIds.some(id=>typeof id!=='string'||!id.trim()))throw new Error('INVALID_GROUP');
   if(groupIds.has(group.id)||groupNames.has(group.name.trim().toLocaleLowerCase('sv-SE'))||new Set(group.uoIds).size!==group.uoIds.length)throw new Error('DUPLICATE_GROUP');
   groupIds.add(group.id);groupNames.add(group.name.trim().toLocaleLowerCase('sv-SE'));
  }
 }
}
export function groupOverlap(model:UoGroupModel):string[]{
 const used=new Set<string>(),overlap=new Set<string>();
 for(const group of model.groups)for(const id of group.uoIds){if(used.has(id))overlap.add(id);used.add(id)}
 return [...overlap];
}
/** First membership wins, keeping every observation in exactly one output row. */
export function groupForUo(model:UoGroupModel,id:string):UoGroup|undefined{return model.groups.find(g=>g.uoIds.includes(id))}
