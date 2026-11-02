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
  expect(observed).toEqual(['sources-changed']);
  unsubscribe();
  notifyWorkspaceChange('workspace-reset');
  expect(observed).toEqual(['sources-changed']);
 });
});
