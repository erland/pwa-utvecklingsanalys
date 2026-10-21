import {openDB} from 'idb';
import {emptyProject,type AnalysisProject} from './model';
const DB='utvecklingsanalys';const VERSION=1;const STORE='projects';
async function database(){return openDB(DB,VERSION,{upgrade(db){if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE);}});}
export async function loadProject():Promise<AnalysisProject>{const db=await database();const saved=await db.get(STORE,'active');if(saved) return saved as AnalysisProject;const created=emptyProject();await db.put(STORE,created,'active');return created;}
// Keep rapid edits in order: opening separate IndexedDB connections must not reorder writes.
let pendingWrite:Promise<void>=Promise.resolve();
export function saveProject(project:AnalysisProject):Promise<void>{
 const snapshot={...project,updatedAt:new Date().toISOString()};
 const next=pendingWrite.catch(()=>{}).then(async()=>{const db=await database();await db.put(STORE,snapshot,'active');});
 pendingWrite=next;
 return next;
}
