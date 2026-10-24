import {loadCanonical,saveCanonical} from '../domain/canonicalStore';
import {loadGapState,saveGapState} from '../gaps/store';
import {loadProject,saveProject} from '../storage';
import {loadSemantic,saveSemantic} from '../domain/semanticStore';
import {loadPlanning,savePlanning} from '../planning/store';
import {loadAllocations,saveAllocations} from '../allocations/store';
import {readConfiguration,commitConfiguration,revisions,replaceConfigurationHistory} from '../config/store';
import {backupToJson,validateBackup,type ProjectBackup} from './format';
import {openDB} from 'idb';

export async function captureProject():Promise<ProjectBackup>{
 const [project,semantic,planning,configuration,legacyAllocations,configurationHistory,gapState,canonical]=await Promise.all([loadProject(),loadSemantic(),loadPlanning(),readConfiguration(),loadAllocations(),revisions(),loadGapState(),loadCanonical()]);
 return validateBackup({format:'utvecklingsanalys-project',version:3,exportedAt:new Date().toISOString(),project,semantic,planning,configuration,legacyAllocations,drafts:[],configurationHistory,gapState,canonical});
}
export async function backupJson(){return backupToJson(await captureProject())}
/** Browser databases are independent; rollback is best-effort, not a distributed transaction. */
async function apply(b:ProjectBackup){
 await saveSemantic(b.semantic);
 await saveCanonical(b.canonical??{schemaVersion:2,records:[]});
 await savePlanning(b.planning);
 await saveProject(b.project);
 await saveGapState(b.gapState??{requirements:[],resolutions:[]});
 if(b.configuration){await commitConfiguration(b.configuration,'Restore project backup', (await revisions()).at(-1)?.id)}
 else {const existing=await readConfiguration();if(existing)await commitConfiguration({...existing,sections:{...existing.sections,allocations:b.legacyAllocations}},'Restore legacy project configuration',(await revisions()).at(-1)?.id);else await saveAllocations(b.legacyAllocations);}
 if(b.version>=2){
  await replaceConfigurationHistory(b.configurationHistory??[]);
 }
}
const JOURNAL='utvecklingsanalys-recovery';
async function recoveryDb(){return openDB(JOURNAL,1,{upgrade(d){d.createObjectStore('restore')}})}
export async function pendingRecovery():Promise<boolean>{return Boolean(await (await recoveryDb()).get('restore','pending'))}
export async function recoverInterruptedRestore():Promise<boolean>{
 const db=await recoveryDb();const snapshot=await db.get('restore','pending') as ProjectBackup|undefined;
 if(!snapshot)return false;
 await apply(validateBackup(snapshot));await db.delete('restore','pending');return true;
}
export async function restoreProject(input:unknown):Promise<void>{
 await recoverInterruptedRestore();
 const incoming=validateBackup(input);
 const before=await captureProject();
 const journal=await recoveryDb();await journal.put('restore',before,'pending');
 try{await apply(incoming);await journal.delete('restore','pending')}
 catch(cause){try{await apply(before);await journal.delete('restore','pending')}catch{throw new Error('RESTORE_FAILED_ROLLBACK_FAILED')}
  throw new Error('RESTORE_FAILED_ROLLED_BACK: '+String(cause));
 }
}
