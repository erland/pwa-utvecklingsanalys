import {loadProject,saveProject} from '../storage';
import {loadSemantic,saveSemantic} from '../domain/semanticStore';
import {loadPlanning,savePlanning} from '../planning/store';
import {loadAllocations,saveAllocations} from '../allocations/store';
import {readConfiguration,commitConfiguration,revisions} from '../config/store';
import {backupToJson,validateBackup,type ProjectBackup} from './format';
import {openDB} from 'idb';

export async function captureProject():Promise<ProjectBackup>{
 const [project,semantic,planning,configuration,legacyAllocations]=await Promise.all([loadProject(),loadSemantic(),loadPlanning(),readConfiguration(),loadAllocations()]);
 return validateBackup({format:'utvecklingsanalys-project',version:1,exportedAt:new Date().toISOString(),project,semantic,planning,configuration,legacyAllocations});
}
export async function backupJson(){return backupToJson(await captureProject())}
/** Browser databases are independent; rollback is best-effort, not a distributed transaction. */
async function apply(b:ProjectBackup){
 await saveSemantic(b.semantic);
 await savePlanning(b.planning);
 await saveProject(b.project);
 if(b.configuration){await commitConfiguration(b.configuration,'Restore project backup', (await revisions()).at(-1)?.id)}
 else {const existing=await readConfiguration();if(existing)await commitConfiguration({...existing,sections:{...existing.sections,allocations:b.legacyAllocations}},'Restore legacy project configuration',(await revisions()).at(-1)?.id);else await saveAllocations(b.legacyAllocations);}
}
export async function restoreProject(input:unknown):Promise<void>{
 const incoming=validateBackup(input);
 const before=await captureProject();
 try{await apply(incoming)}
 catch(cause){try{await apply(before)}catch{throw new Error('RESTORE_FAILED_ROLLBACK_FAILED')}
  throw new Error('RESTORE_FAILED_ROLLED_BACK: '+String(cause));
 }
}
export async function clearImportDraftsAfterRestore(){
 const db=await openDB('utvecklingsanalys-imports',1,{upgrade(d){if(!d.objectStoreNames.contains('drafts'))d.createObjectStore('drafts',{keyPath:'id'})}});
 await db.clear('drafts');
}
