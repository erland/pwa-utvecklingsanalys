import {openDB} from 'idb';
import {loadProject,saveProject} from '../storage';
import {loadSemantic,saveSemantic} from '../domain/semanticStore';
import {listDrafts,deleteDraft,storeDraft,type Draft} from '../import/drafts';
import type {AnalysisProject,DatasetSummary} from '../model';
import type {SemanticDataset} from '../domain/semantic';

/** Durable undo journal: project, semantic data and import drafts live in separate IndexedDB databases. */
type Snapshot={project:AnalysisProject;semantic:SemanticDataset;drafts:Draft[]};
const JOURNAL='utvecklingsanalys-source-recovery';
async function journal(){return openDB(JOURNAL,1,{upgrade(db){db.createObjectStore('snapshots')}})}
async function capture():Promise<Snapshot>{
 const [project,semantic,drafts]=await Promise.all([loadProject(),loadSemantic(),listDrafts()]);
 return {project,semantic,drafts};
}
async function restore(snapshot:Snapshot){
 await saveSemantic(snapshot.semantic);
 await saveProject(snapshot.project);
 const current=await listDrafts();
 for(const d of current)await deleteDraft(d.id);
 for(const d of snapshot.drafts)await storeDraft(d);
}
export async function recoverSourceMutation():Promise<boolean>{
 const db=await journal();const before=await db.get('snapshots','pending') as Snapshot|undefined;
 if(!before)return false;
 await restore(before);await db.delete('snapshots','pending');return true;
}
let queued:Promise<unknown>=Promise.resolve();
function mutate<T>(operation:()=>Promise<T>):Promise<T>{
 const run=queued.catch(()=>{}).then(async()=>{
  await recoverSourceMutation();
  const db=await journal();const before=await capture();
  await db.put('snapshots',before,'pending');
  try{const value=await operation();await db.delete('snapshots','pending');return value}
  catch(e){try{await restore(before);await db.delete('snapshots','pending')}catch{throw new Error('SOURCE_MUTATION_ROLLBACK_FAILED')}throw e}
 });
 queued=run;return run;
}
/** Retain shared/manual entities and relationships, but never retain source observations. */
export function withoutSources(semantic:SemanticDataset,ids:readonly string[]):SemanticDataset{
 const remove=new Set(ids);
 return {...semantic,observations:semantic.observations.filter(o=>!remove.has(o.source.datasetId))};
}
export async function deleteImportedSources(ids:string[]):Promise<AnalysisProject>{
 if(!ids.length)throw new Error('NO_SOURCE_SELECTED');
 return mutate(async()=>{
  const project=await loadProject(),semantic=await loadSemantic();
  if(ids.some(id=>!project.datasets.some(d=>d.id===id)))throw new Error('UNKNOWN_SOURCE');
  const next={...project,datasets:project.datasets.filter(d=>!ids.includes(d.id))};
  await saveSemantic(withoutSources(semantic,ids));
  await saveProject(next);
  for(const draft of await listDrafts())if(ids.includes(draft.id))await deleteDraft(draft.id);
  return next;
 });
}
export async function replaceImportedSource(id:string,build:(before:SemanticDataset)=>SemanticDataset,source:Omit<DatasetSummary,'id'>,draft?:Draft):Promise<AnalysisProject>{
 return mutate(async()=>{
  const project=await loadProject(),semantic=await loadSemantic();
  if(!project.datasets.some(d=>d.id===id))throw new Error('UNKNOWN_SOURCE');
  const nextSemantic=build(withoutSources(semantic,[id]));
  if(!nextSemantic.observations.some(o=>o.source.datasetId===id))throw new Error('REPLACEMENT_HAS_NO_OBSERVATIONS');
  if(nextSemantic.observations.some(o=>o.source.datasetId===id&&!Number.isFinite(o.value)))throw new Error('INVALID_REPLACEMENT');
  const next={...project,datasets:project.datasets.map(d=>d.id===id?{...source,id}:d)};
  await saveSemantic(nextSemantic);await saveProject(next);
  for(const d of await listDrafts())if(d.id===id||draft&&d.id===draft.id)await deleteDraft(d.id);
  if(draft)await storeDraft({...draft,id,status:'ready',updatedAt:new Date().toISOString()});
  return next;
 });
}
