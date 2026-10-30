import {useEffect,useState} from 'react';
import {loadSemantic} from '../domain/semanticStore';
import {commitConfiguration,initializeConfiguration,readConfiguration,revisions} from '../config/store';
import {loadAllocations} from '../allocations/store';
import {groupOverlap,validateGroupModels,type UoGroupModel} from './groupModels';
import type {Entity} from '../domain/semantic';

export default function GroupsView({onSaved,embedded=false}:{onSaved:()=>void;embedded?:boolean}){
 const [editing,setEditing]=useState(!embedded),[original,setOriginal]=useState<UoGroupModel[]|null>(null),[confirmDelete,setConfirmDelete]=useState<string|null>(null);
 const [units,setUnits]=useState<Entity[]>([]),[models,setModels]=useState<UoGroupModel[]>([]),[selected,setSelected]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{let active=true;Promise.all([loadSemantic(),loadAllocations()]).then(async([semantic,allocations])=>{
  await initializeConfiguration(allocations,{});
  const config=await readConfiguration();if(active){setUnits(semantic.entities.filter(e=>e.kind==='uo'));setModels(config?.sections.groups??[]);setSelected(config?.activeGroupModelId??'')}
 }).catch(()=>{if(active)setError('Kunde inte läsa gruppmodeller och UO.')});return()=>{active=false}},[]);
 const model=models.find(m=>m.id===selected)??models[0];
 const modify=(fn:(x:UoGroupModel[])=>UoGroupModel[])=>{setModels(ms=>fn(ms));setNotice('');setError('')};
 const updateModel=(fn:(m:UoGroupModel)=>UoGroupModel)=>modify(ms=>ms.map(m=>m.id===model.id?fn(m):m));
 const addModel=()=>{const id=crypto.randomUUID();if(embedded){setOriginal(models);setEditing(true)}modify(ms=>[...ms,{id,name:'Ny grupperingsmodell',groups:[]}]);setSelected(id)};
 const beginEdit=(id:string)=>{setOriginal(models);setSelected(id);setEditing(true);setError('');setNotice('')};
 const cancelEdit=()=>{if(original)setModels(original);setOriginal(null);setEditing(false);setConfirmDelete(null);setError('');setNotice('')};
 const removeModel=async(id:string)=>{setBusy(true);setError('');try{const updated=models.filter(m=>m.id!==id);validateGroupModels(updated);const config=await readConfiguration();if(!config)throw new Error('Konfigurationen är inte initierad');const history=await revisions();await commitConfiguration({...config,activeGroupModelId:config.activeGroupModelId===id?(updated[0]?.id??undefined):config.activeGroupModelId,sections:{...config.sections,groups:updated}},'Delete UO group model',history.at(-1)?.id);setModels(updated);setSelected(updated[0]?.id??'');setConfirmDelete(null);setNotice('Gruppmodellen togs bort och ändringen sparades.');onSaved()}catch(e){setError(String(e))}finally{setBusy(false)}};
 const save=async()=>{setBusy(true);setError('');setNotice('');try{
  validateGroupModels(models);
  const config=await readConfiguration();if(!config)throw new Error('Konfigurationen är inte initierad');
  const history=await revisions();
  await commitConfiguration({...config,activeGroupModelId:model?.id,sections:{...config.sections,groups:models}},'Update UO group models',history.at(-1)?.id);
  onSaved();setOriginal(null);if(embedded)setEditing(false);setNotice('Gruppmodeller sparade i versionshistoriken och ingår i projektbackup.');
 }catch(e){setError('Kunde inte spara gruppmodeller: '+String(e))}finally{setBusy(false)}};
 return <>{embedded?<h2>UO-grupper</h2>:<><div className="eyebrow">GRUPPERINGAR</div><h1>Gruppera utvecklingsområden</h1></>}<p className="lead">Skapa alternativa gruppmodeller av importerade UO. Originalvärden ändras aldrig. Välj aktiv gruppindelning och spara innan du går till analysen.</p>
 {error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
 {embedded&&!editing&&<section className="panel" aria-label="Översikt UO-gruppmodeller"><div className="actions"><h3>Befintliga gruppmodeller</h3><button type="button" className="secondary" onClick={addModel}>Ny gruppmodell</button></div>{models.length===0?<p>Inga gruppmodeller har skapats.</p>:models.map(m=><div className="panel" key={m.id}><strong>{m.name}</strong><p>{m.groups.length} grupper · {new Set(m.groups.flatMap(g=>g.uoIds)).size} UO {m.id===selected?'· Aktiv gruppindelning':''}</p><div className="actions"><button type="button" className="secondary" onClick={()=>beginEdit(m.id)}>Redigera {m.name}</button><button type="button" className="secondary" onClick={()=>setConfirmDelete(m.id)}>Ta bort {m.name}</button></div>{confirmDelete===m.id&&<div role="group" aria-label={'Bekräfta borttagning av '+m.name}><p>Ta bort gruppmodellen {m.name} och dess grupper? Originaldata ändras inte.</p><div className="actions"><button type="button" className="primary" disabled={busy} onClick={()=>void removeModel(m.id)}>Bekräfta borttagning</button><button type="button" className="secondary" onClick={()=>setConfirmDelete(null)}>Avbryt</button></div></div>}</div>)}</section>}
 {(!embedded||editing)&& <section className="panel"><h2>Gruppmodeller</h2><label htmlFor="group-model-edit">Aktiv gruppindelning</label><select id="group-model-edit" value={model?.id??''} onChange={e=>setSelected(e.target.value)}>{!model&&<option value="">Ingen modell</option>}{models.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select>
 <div className="actions"><button className="secondary" onClick={addModel}>Ny gruppmodell</button>{model&&<button className="secondary" onClick={()=>{modify(ms=>ms.filter(m=>m.id!==model.id));setSelected('')}}>Ta bort modell</button>}</div>
 {model&&<><label htmlFor="group-model-name">Modellnamn</label><input id="group-model-name" value={model.name} onChange={e=>updateModel(m=>({...m,name:e.target.value}))}/>
 <h2>Grupper</h2><button className="secondary" onClick={()=>updateModel(m=>({...m,groups:[...m.groups,{id:crypto.randomUUID(),name:'Ny grupp',uoIds:[]}]}))}>Lägg till grupp</button>
 {model.groups.map(g=><fieldset key={g.id}><legend>Grupp</legend><label htmlFor={'group-name-'+g.id}>Gruppnamn</label><input id={'group-name-'+g.id} value={g.name} onChange={e=>updateModel(m=>({...m,groups:m.groups.map(x=>x.id===g.id?{...x,name:e.target.value}:x)}))}/>
 <div className="actions"><button className="secondary" onClick={()=>updateModel(m=>({...m,groups:m.groups.filter(x=>x.id!==g.id)}))}>Ta bort grupp</button></div>
 <div className="mapping-grid">{units.map(u=><label key={u.id} className="check"><input type="checkbox" checked={g.uoIds.includes(u.id)} onChange={e=>updateModel(m=>({...m,groups:m.groups.map(x=>x.id===g.id?{...x,uoIds:e.target.checked?[...x.uoIds,u.id]:x.uoIds.filter(id=>id!==u.id)}:x)}))}/>{u.name}</label>)}</div></fieldset>)}
 {groupOverlap(model).length>0&&<p role="status" className="notice">Överlapp: {groupOverlap(model).map(id=>units.find(u=>u.id===id)?.name??id).join(', ')}. Vid analys tillhör varje UO endast den första matchande gruppen.</p>}
 {units.length===0&&<p>Det finns inga importerade UO ännu. Importera data för att välja medlemmar.</p>}
 </>}
 <div className="actions"><button className="primary" disabled={busy} onClick={()=>{void save()}}>Spara gruppmodeller</button>{embedded&&<button type="button" className="secondary" disabled={busy} onClick={cancelEdit}>Avbryt redigering</button>}</div></section>}</>
}
