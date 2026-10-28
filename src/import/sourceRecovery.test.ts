import {beforeEach,describe,expect,it,vi} from 'vitest';
import {emptySemantic} from '../domain/semantic';
import {emptyCanonical} from '../domain/canonical';
const journal=vi.hoisted(()=>new Map<string,unknown>());
vi.mock('idb',()=>({openDB:vi.fn(async()=>({
 get:async(_store:string,key:string)=>structuredClone(journal.get(key)),
 put:async(_store:string,value:unknown,key:string)=>{journal.set(key,structuredClone(value))},
 delete:async(_store:string,key:string)=>{journal.delete(key)}
}))}));
import type {AnalysisProject} from '../model';

const state=vi.hoisted(()=>({
 project:null as AnalysisProject|null,
 semantic:null as ReturnType<typeof emptySemantic>|null,
 canonical:null as ReturnType<typeof emptyCanonical>|null,
 failProject:false
}));
vi.mock('../storage',()=>({
 loadProject:vi.fn(async()=>structuredClone(state.project)),
 saveProject:vi.fn(async(value:AnalysisProject)=>{if(state.failProject){state.failProject=false;throw new Error('SIMULATED_PROJECT_WRITE_FAILURE')}state.project=structuredClone(value)})
}));
vi.mock('../domain/semanticStore',()=>({
 loadSemantic:vi.fn(async()=>structuredClone(state.semantic)),
 saveSemantic:vi.fn(async(value:ReturnType<typeof emptySemantic>)=>{state.semantic=structuredClone(value)})
}));
vi.mock('../domain/canonicalStore',()=>({
 loadCanonical:vi.fn(async()=>structuredClone(state.canonical)),
 saveCanonical:vi.fn(async(value:ReturnType<typeof emptyCanonical>)=>{state.canonical=structuredClone(value)})
}));
import {deleteImportedSources,recoverSourceMutation,replaceImportedSource} from './sourceManagement';

const source={id:'source-1',name:'Budget',planningYear:2027,source:'excel' as const,importedAt:'2026-10-01'};
beforeEach(()=>{
 journal.clear();
 state.project={schemaVersion:1,id:'project',name:'Demo',datasets:[source],updatedAt:'2026-10-01'};
 state.semantic=emptySemantic();
 state.semantic.entities.push({id:'uo',kind:'uo',name:'UO',aliases:[]});
 state.semantic.observations.push({id:'observation-1',entityId:'uo',measureId:'it_hours',value:10,kind:'detail',period:{year:2027},planningVersion:'v1',scenario:'need',quality:'reported',source:{datasetId:source.id,fileName:'budget.xlsx',sheet:'Data',cell:'A1'}});
 state.canonical=emptyCanonical();
 state.failProject=false;
});
describe('cross-store source mutation recovery',()=>{
 it('recovers an interrupted mutation from the durable journal and clears it only after restoration',async()=>{
  const before={project:structuredClone(state.project),semantic:structuredClone(state.semantic),canonical:structuredClone(state.canonical)};
  journal.set('pending',structuredClone(before));
  state.project={...state.project!,datasets:[]};
  state.semantic={...state.semantic!,observations:[]};
  state.canonical={...state.canonical!,records:[]};
  expect(await recoverSourceMutation()).toBe(true);
  expect(state.project).toEqual(before.project);
  expect(state.semantic).toEqual(before.semantic);
  expect(state.canonical).toEqual(before.canonical);
  expect(journal.has('pending')).toBe(false);
  expect(await recoverSourceMutation()).toBe(false);
 });
 it('retains the journal if recovery itself fails so another attempt can restore data',async()=>{
  const before={project:structuredClone(state.project),semantic:structuredClone(state.semantic),canonical:structuredClone(state.canonical)};
  journal.set('pending',structuredClone(before));
  state.project={...state.project!,datasets:[]};
  state.semantic={...state.semantic!,observations:[]};
  state.failProject=true;
  await expect(recoverSourceMutation()).rejects.toThrow('SIMULATED_PROJECT_WRITE_FAILURE');
  expect(journal.has('pending')).toBe(true);
  expect(await recoverSourceMutation()).toBe(true);
  expect(state.project).toEqual(before.project);
  expect(state.semantic).toEqual(before.semantic);
  expect(state.canonical).toEqual(before.canonical);
  expect(journal.has('pending')).toBe(false);
 });
 it('rolls back source deletion after project write failure',async()=>{
  const before={project:structuredClone(state.project),semantic:structuredClone(state.semantic),canonical:structuredClone(state.canonical)};
  state.failProject=true;
  await expect(deleteImportedSources([source.id])).rejects.toThrow('SIMULATED_PROJECT_WRITE_FAILURE');
  expect(state.project).toEqual(before.project);
  expect(state.semantic).toEqual(before.semantic);
  expect(state.canonical).toEqual(before.canonical);
  expect(await recoverSourceMutation()).toBe(false);
 });
 it('rejects a replacement with no observations without changing any store',async()=>{
  const before={project:structuredClone(state.project),semantic:structuredClone(state.semantic),canonical:structuredClone(state.canonical)};
  await expect(replaceImportedSource(source.id,before=>({...before,observations:[]}),{name:'New',planningYear:2027,source:'excel',importedAt:'2026-10-02'})).rejects.toThrow('REPLACEMENT_HAS_NO_OBSERVATIONS');
  expect(state.project).toEqual(before.project);
  expect(state.semantic).toEqual(before.semantic);
  expect(state.canonical).toEqual(before.canonical);
 });
});
