import {beforeEach,describe,expect,it,vi} from 'vitest';
import type {ProjectBackup} from './format';
import {emptyAllocations} from '../allocations/model';

// Fault injection focuses on the restore journal and write order. Backup schema
// validation has separate tests in format.test.ts.
const mocks=vi.hoisted(()=>{
 const values:{project:unknown;semantic:unknown;canonical:unknown;planning:unknown;gapState:unknown;allocations:unknown}={
  project:null,semantic:null,canonical:null,planning:null,gapState:null,allocations:null
 };
 const journal:{pending:unknown}={pending:undefined};
 return {
  values,journal,failNextCanonical:{value:false},
  saveCanonical:vi.fn(async (next:unknown)=>{
   if(mocks.failNextCanonical.value){mocks.failNextCanonical.value=false;throw new Error('SIMULATED_STORAGE_FAILURE')}
   mocks.values.canonical=next;
  }),
  saveSemantic:vi.fn(async (next:unknown)=>{mocks.values.semantic=next}),
  savePlanning:vi.fn(async (next:unknown)=>{mocks.values.planning=next}),
  saveProject:vi.fn(async (next:unknown)=>{mocks.values.project=next}),
  saveGapState:vi.fn(async (next:unknown)=>{mocks.values.gapState=next}),
  saveAllocations:vi.fn(async (next:unknown)=>{mocks.values.allocations=next})
 };
});
vi.mock('./format',()=>({
 validateBackup:(input:unknown)=>input,
 backupToJson:(input:unknown)=>JSON.stringify(input)
}));
vi.mock('../domain/canonicalStore',()=>({loadCanonical:async()=>mocks.values.canonical,saveCanonical:mocks.saveCanonical}));
vi.mock('../domain/semanticStore',()=>({loadSemantic:async()=>mocks.values.semantic,saveSemantic:mocks.saveSemantic}));
vi.mock('../planning/store',()=>({loadPlanning:async()=>mocks.values.planning,savePlanning:mocks.savePlanning}));
vi.mock('../storage',()=>({loadProject:async()=>mocks.values.project,saveProject:mocks.saveProject}));
vi.mock('../gaps/store',()=>({loadGapState:async()=>mocks.values.gapState,saveGapState:mocks.saveGapState}));
vi.mock('../allocations/store',()=>({loadAllocations:async()=>mocks.values.allocations,saveAllocations:mocks.saveAllocations}));
vi.mock('../config/store',()=>({
 readConfiguration:async()=>null,
 commitConfiguration:vi.fn(),
 revisions:async()=>[],
 replaceConfigurationHistory:async()=>undefined
}));
vi.mock('idb',()=>({
 openDB:async()=>({
  get:async (_store:string,key:string)=>key==='pending'?mocks.journal.pending:undefined,
  put:async (_store:string,value:unknown,key:string)=>{if(key==='pending')mocks.journal.pending=value},
  delete:async (_store:string,key:string)=>{if(key==='pending')mocks.journal.pending=undefined}
 })
}));

import {captureProject,pendingRecovery,recoverInterruptedRestore,restoreProject} from './store';

const backup=(id:string):ProjectBackup=>({
 format:'utvecklingsanalys-project',version:3,exportedAt:'2026-11-03',
 project:{schemaVersion:1,id,name:id,datasets:[],updatedAt:'2026-11-03'},
 semantic:{schemaVersion:1,entities:[],measures:[],observations:[],relations:[]},
 planning:{schemaVersion:1,scenarios:[]},
 configuration:null,
 legacyAllocations:emptyAllocations(),
 drafts:[],configurationHistory:[],
 gapState:{requirements:[],resolutions:[]},
 canonical:{schemaVersion:2,records:[]}
}) satisfies ProjectBackup;
function setCurrent(b:ProjectBackup){
 mocks.values.project=b.project;
 mocks.values.semantic=b.semantic;
 mocks.values.canonical=b.canonical;
 mocks.values.planning=b.planning;
 mocks.values.gapState=b.gapState;
 mocks.values.allocations=b.legacyAllocations;
}

describe('project restore failure and journal checkpoints',()=>{
 beforeEach(()=>{
  vi.clearAllMocks();
  mocks.journal.pending=undefined;
  mocks.failNextCanonical.value=false;
  setCurrent(backup('before'));
 });
 it('rolls back every persisted component and removes journal after an injected write failure',async()=>{
  const before=await captureProject();
  const incoming=backup('incoming');
  mocks.failNextCanonical.value=true;
  await expect(restoreProject(incoming)).rejects.toThrow('RESTORE_FAILED_ROLLED_BACK: Error: SIMULATED_STORAGE_FAILURE');
  expect(await pendingRecovery()).toBe(false);
  const after=await captureProject();
  expect(after.project).toEqual(before.project);
  expect(after.semantic).toEqual(before.semantic);
  expect(after.canonical).toEqual(before.canonical);
  expect(after.planning).toEqual(before.planning);
  expect(after.gapState).toEqual(before.gapState);
  expect(after.legacyAllocations).toEqual(before.legacyAllocations);
  expect(mocks.saveSemantic).toHaveBeenCalledTimes(2);
  expect(mocks.saveCanonical).toHaveBeenCalledTimes(2);
 });
 it('replays pending journal on startup after an interrupted restore',async()=>{
  const before=await captureProject();
  setCurrent(backup('partially-restored'));
  mocks.journal.pending=before;
  expect(await pendingRecovery()).toBe(true);
  expect(await recoverInterruptedRestore()).toBe(true);
  expect((await captureProject()).project).toEqual(before.project);
  expect(await pendingRecovery()).toBe(false);
  expect(await recoverInterruptedRestore()).toBe(false);
 });
 it('keeps the journal when recovery write fails so a later retry can restore it',async()=>{
  const before=await captureProject();
  setCurrent(backup('partially-restored'));
  mocks.journal.pending=before;
  mocks.failNextCanonical.value=true;
  await expect(recoverInterruptedRestore()).rejects.toThrow('SIMULATED_STORAGE_FAILURE');
  expect(await pendingRecovery()).toBe(true);
  expect(await recoverInterruptedRestore()).toBe(true);
  expect((await captureProject()).project).toEqual(before.project);
  expect(await pendingRecovery()).toBe(false);
 });
});
