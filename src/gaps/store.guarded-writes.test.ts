import {beforeEach,describe,expect,it,vi} from 'vitest';
import {loadGapState,saveGapState} from './store';

const storage=vi.hoisted(()=>({value:null as unknown}));
vi.mock('idb',()=>({
 openDB:vi.fn(async()=>({
  get:async()=>structuredClone(storage.value),
  put:async(...args:unknown[])=>{storage.value=structuredClone(args[1])},
  transaction:()=>({
   store:{
    get:async()=>structuredClone(storage.value),
    put:async(...args:unknown[])=>{storage.value=structuredClone(args[0])}
   },
   done:Promise.resolve()
  })
 }))
}));

describe('KF-002 guarded GapState writes',()=>{
 beforeEach(()=>{storage.value=null});
 it('rejects a stale snapshot without removing the first writer\'s changes',async()=>{
  const first=await loadGapState(),second=await loadGapState();
  const firstEdit={...first,resolutions:[{
   key:'uo-a/2027',status:'manual' as const,value:42,reason:'Första',updatedAt:'2026-11-03'
  }]};
  const secondEdit={...second,requirements:[{
   id:'hours',name:'Timmar',measureId:'it_hours',entityKind:'uo' as const,
   years:[2027],activities:['development'],required:true
  }]};
  await saveGapState(firstEdit,first);
  await expect(saveGapState(secondEdit,second)).rejects.toThrow('STALE_GAP_STATE');
  expect(await loadGapState()).toEqual(firstEdit);
 });
 it('allows the next writer after reloading the latest state',async()=>{
  const before=await loadGapState();
  await saveGapState({...before,requirements:[]},before);
  const latest=await loadGapState();
  const next={...latest,resolutions:[{key:'ok',status:'unknown' as const,reason:'Test',updatedAt:'2026-11-03'}]};
  await saveGapState(next,latest);
  expect(await loadGapState()).toEqual(next);
 });
});
