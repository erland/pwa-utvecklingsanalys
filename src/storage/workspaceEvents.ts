/** Cross-tab invalidation for destructive local workspace mutations. */
export type WorkspaceChange='sources-changed'|'workspace-reset';
const channelName='utvecklingsanalys-workspace-events';
export function notifyWorkspaceChange(type:WorkspaceChange):void{
 if(typeof BroadcastChannel==='undefined')return;
 const channel=new BroadcastChannel(channelName);
 channel.postMessage({type,at:Date.now()});
 channel.close();
}
export function onWorkspaceChange(callback:(type:WorkspaceChange)=>void):()=>void{
 if(typeof BroadcastChannel==='undefined')return ()=>{};
 const channel=new BroadcastChannel(channelName);
 channel.onmessage=(event:MessageEvent)=>{
  if(event.data?.type==='sources-changed'||event.data?.type==='workspace-reset')callback(event.data.type);
 };
 return ()=>channel.close();
}
