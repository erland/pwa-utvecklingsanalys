import {afterEach,describe,expect,it,vi} from 'vitest';
import {notifyWorkspaceChange,onWorkspaceChange} from './workspaceEvents';

describe('cross-tab workspace invalidation',()=>{
 const original=globalThis.BroadcastChannel;
 afterEach(()=>{vi.stubGlobal('BroadcastChannel',original)});
 it('publishes destructive changes and unregisters listeners',()=>{
  const channels:{onmessage:((event:{data:unknown})=>void)|null;postMessage:(value:unknown)=>void;close:()=>void}[]=[];
  class MockChannel{
   onmessage:((event:{data:unknown})=>void)|null=null;
   constructor(public readonly name:string){channels.push(this)}
   postMessage(value:unknown){for(const ch of channels)if(ch!==this)ch.onmessage?.({data:value})}
   close(){this.onmessage=null}
  }
  vi.stubGlobal('BroadcastChannel',MockChannel);
  const observed:string[]=[];
  const unsubscribe=onWorkspaceChange(type=>observed.push(type));
  notifyWorkspaceChange('sources-changed');
  // Two BroadcastChannel objects in one tab must not trigger a self-invalidation.
  expect(observed).toEqual([]);
  const remote=new MockChannel('utvecklingsanalys-workspace-events');
  remote.postMessage({type:'sources-changed',senderId:'another-tab'});
  expect(observed).toEqual(['sources-changed']);
  remote.postMessage({type:'workspace-reset',senderId:'another-tab'});
  expect(observed).toEqual(['sources-changed','workspace-reset']);
  remote.postMessage({type:'gap-state-changed',senderId:'another-tab'});
  expect(observed).toEqual(['sources-changed','workspace-reset','gap-state-changed']);
  remote.postMessage({type:'unrecognized',senderId:'another-tab'});
  expect(observed).toEqual(['sources-changed','workspace-reset','gap-state-changed']);
  unsubscribe();
  remote.postMessage({type:'sources-changed',senderId:'another-tab'});
  expect(observed).toEqual(['sources-changed','workspace-reset','gap-state-changed']);
 });
});
