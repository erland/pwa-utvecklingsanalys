import {beforeEach,describe,expect,it,vi} from 'vitest';
import {loadGapState,saveGapState} from './store';

// Minimal deterministic IndexedDB boundary: each get returns an independent
// structured-clone snapshot, as a real IndexedDB read would.
const storage=vi.hoisted(()=>({value:null as unknown}));
vi.mock('idb',()=>({
 openDB:vi.fn(async()=>({
  get:async()=>structuredClone(storage.value),
  put:async(...args:unknown[])=>{storage.value=structuredClone(args[1])}
 }))
}));

describe('GapState persistence baseline (KF-001)',()=>{
 beforeEach(()=>{storage.value=null});

 it('loads an empty state before the first save and round-trips a saved state',async()=>{
  expect(await loadGapState()).toEqual({requirements:[],resolutions:[]});
  const saved={requirements:[],resolutions:[{
   key:'uo-a/2027',status:'manual' as const,value:42,reason:'Kompletterad',updatedAt:'2026-11-03'
  }]};
  await saveGapState(saved);
  expect(await loadGapState()).toEqual(saved);
 });

 it('characterizes the KNOWN RISK: stale whole-state save silently replaces a newer write',async()=>{
  const first=await loadGapState();
  const second=await loadGapState(); // another editor loaded before the first write
  const firstEdit={...first,resolutions:[{
   key:'uo-a/2027',status:'manual' as const,value:42,reason:'Första redigeraren',updatedAt:'2026-11-03'
  }]};
  const secondEdit={...second,requirements:[{
   id:'hours',name:'Timmar',measureId:'it_hours',entityKind:'uo' as const,
   years:[2027],activities:['development'],required:true
  }]};

  await saveGapState(firstEdit);
  expect((await loadGapState()).resolutions).toEqual(firstEdit.resolutions);
  await saveGapState(secondEdit);

  // This is the CURRENT behavior, not the desired contract. KF-002 must
  // replace it with a rejected stale revision / transactional update.
  expect((await loadGapState()).requirements).toEqual(secondEdit.requirements);
  expect((await loadGapState()).resolutions).toEqual([]);
 });
});
