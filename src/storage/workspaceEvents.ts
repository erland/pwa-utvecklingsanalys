/** Cross-tab invalidation for destructive local workspace mutations. */
export type WorkspaceChange='sources-changed'|'workspace-reset'|'gap-state-changed';
const channelName='utvecklingsanalys-workspace-events';
// Each browser tab has its own module instance; exclude messages sent by this tab.
const senderId=crypto.randomUUID();
export function notifyWorkspaceChange(type:WorkspaceChange):void{
 if(typeof BroadcastChannel==='undefined')return;
 const channel=new BroadcastChannel(channelName);
 channel.postMessage({type,at:Date.now(),senderId});
 channel.close();
}
export function onWorkspaceChange(callback:(type:WorkspaceChange)=>void):()=>void{
 if(typeof BroadcastChannel==='undefined')return ()=>{};
 const channel=new BroadcastChannel(channelName);
 channel.onmessage=(event:MessageEvent)=>{
  if(event.data?.senderId===senderId)return;
  if(event.data?.type==='sources-changed'||event.data?.type==='workspace-reset'||event.data?.type==='gap-state-changed')callback(event.data.type);
 };
 return ()=>channel.close();
}
