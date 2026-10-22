import {useState} from 'react';
import {developmentMatrix,type MatrixMapping} from './matrixSection';
type Props={value:MatrixMapping;onChange:(next:MatrixMapping)=>void};
const measureIds=['it_hours','business_hours','consultant_cost','other_cost'];
const units=['h','SEK'] as const;
export default function MatrixMappingEditor({value,onChange}:Props){
 const [alias,setAlias]=useState(''),[activity,setActivity]=useState('development');
 const [measureAlias,setMeasureAlias]=useState(''),[measureId,setMeasureId]=useState('it_hours'),[factor,setFactor]=useState('1'),[unit,setUnit]=useState<'h'|'SEK'>('h');
 const update=(next:Partial<MatrixMapping>)=>onChange({...value,...next});
 return <div className="mapping-settings"><h3>Avancerad sektionsmappning</h3>
 <label>Bladnamn<input aria-label="Matrisblad" value={value.sheet} onChange={e=>update({sheet:e.target.value})}/></label>
 <h3>Aktivitetsrubriker</h3><p className="notice">Rubrikens början matchas utan hänsyn till skiftläge. Varje alias kopplas till utveckling eller förvaltning.</p>
 <table className="analysis-table"><thead><tr><th>Rubrikprefix</th><th>Aktivitet</th><th>Åtgärd</th></tr></thead><tbody>{Object.entries(value.activityNames).map(([a,v])=><tr key={a}><td>{a}</td><td>{v==='development'?'Utveckling':'Förvaltning'}</td><td><button className="secondary" onClick={()=>update({activityNames:Object.fromEntries(Object.entries(value.activityNames).filter(([key])=>key!==a))})}>Ta bort {a}</button></td></tr>)}</tbody></table>
 <label>Nytt aktivitetsalias<input aria-label="Nytt aktivitetsalias" value={alias} onChange={e=>setAlias(e.target.value)}/></label>
 <label>Aktivitet<select aria-label="Aliasets aktivitet" value={activity} onChange={e=>setActivity(e.target.value)}><option value="development">Utveckling</option><option value="maintenance">Förvaltning</option></select></label>
 <button className="secondary" disabled={!alias.trim()} onClick={()=>{update({activityNames:{...value.activityNames,[alias.trim().toLocaleLowerCase('sv-SE')]:activity}});setAlias('')}}>Lägg till aktivitetsalias</button>
 <h3>Måttnamn och enheter</h3><table className="analysis-table"><thead><tr><th>Excelrubrik</th><th>Mått</th><th>Enhet</th><th>Faktor</th><th>Åtgärd</th></tr></thead><tbody>{Object.entries(value.measureNames).map(([a,m])=><tr key={a}><td>{a}</td><td>{m.id}</td><td>{m.unit}</td><td>{m.factor}</td><td><button className="secondary" onClick={()=>update({measureNames:Object.fromEntries(Object.entries(value.measureNames).filter(([key])=>key!==a))})}>Ta bort {a}</button></td></tr>)}</tbody></table>
 <label>Nytt måttalias<input aria-label="Nytt måttalias" value={measureAlias} onChange={e=>setMeasureAlias(e.target.value)}/></label>
 <label>Semantiskt mått<select aria-label="Semantiskt mått" value={measureId} onChange={e=>{setMeasureId(e.target.value);setUnit(e.target.value.endsWith('hours')?'h':'SEK')}}>{measureIds.map(id=><option key={id} value={id}>{id}</option>)}</select></label>
 <label>Enhet<select aria-label="Enhet för nytt mått" value={unit} onChange={e=>setUnit(e.target.value as 'h'|'SEK')}>{units.map(u=><option key={u}>{u}</option>)}</select></label>
 <label>Omräkningsfaktor<input aria-label="Omräkningsfaktor" type="number" min="0.000001" step="any" value={factor} onChange={e=>setFactor(e.target.value)}/></label>
 <button className="secondary" disabled={!measureAlias.trim()||!Number.isFinite(Number(factor))||Number(factor)<=0||(measureId.endsWith('hours')?unit!=='h':unit!=='SEK')} onClick={()=>{update({measureNames:{...value.measureNames,[measureAlias.trim().toLocaleLowerCase('sv-SE')]:{id:measureId,unit,factor:Number(factor)}}});setMeasureAlias('')}}>Lägg till måttalias</button>
 <button className="secondary" onClick={()=>update(developmentMatrix(value.sheet))}>Återställ föreslagen mappning</button>
 </div>;
}
