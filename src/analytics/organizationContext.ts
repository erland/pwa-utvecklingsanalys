import type {CanonicalDataset} from '../domain/canonical';
import type {UoGroupModel} from './groupModels';
import {groupForUo} from './groupModels';

export type OrganizationSelection={level:'all-uos'|'groups'|'group'|'uo'|'part';groupId?:string;uoId?:string;partId?:string};
export const defaultOrganizationSelection=():OrganizationSelection=>({level:'all-uos'});

/** One organizational scope shared by navigator and all annual analysis reports.
 * Never project LO from different UOs into the same comparison.
 */
export function organizationScope(data:CanonicalDataset,selection:OrganizationSelection,model?:UoGroupModel){
 const uos=[...new Set(data.records.filter(r=>r.scope.axis==='work'&&(r.scope.loId||r.workPart==='uo-overhead')).map(r=>r.scope.axis==='work'?r.scope.uoId:''))].filter(Boolean);
 if(selection.level==='all-uos')return {level:'uos' as const,uoIds:uos};
 if(selection.level==='groups')return {level:'groups' as const,uoIds:uos};
 if(selection.level==='group'){
  if(!model||!selection.groupId)return {level:'uos' as const,uoIds:[]};
  return {level:'uos' as const,uoIds:uos.filter(id=>(groupForUo(model,id)?.id??'unassigned')===selection.groupId)};
 }
 if(!selection.uoId||!uos.includes(selection.uoId))return {level:'uos' as const,uoIds:[]};
 if(selection.level==='uo')return {level:'parts' as const,uoIds:[selection.uoId],detailUoId:selection.uoId};
 return {level:'part' as const,uoIds:[selection.uoId],detailUoId:selection.uoId,partId:selection.partId};
}

export function visiblePartRows<T extends {key:string}>(rows:readonly T[],selection:OrganizationSelection):T[]{
 return selection.level==='part'?rows.filter(row=>row.key===selection.partId):[...rows];
}
