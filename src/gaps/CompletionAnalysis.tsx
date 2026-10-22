import {useEffect,useMemo,useState} from 'react';
import type {SemanticDataset} from '../domain/semantic';
import {loadGapState,type GapState} from './store';
import {manualApprovedRows,reviewManualApprovals} from './manualApproval';
import {approvedRows,evaluateApprovals} from './approved';
export default function CompletionAnalysis({data,year,measureId}:{data:SemanticDataset;year?:number;measureId:string}){
 const[state,setState]=useState<GapState|null>(null),[mode,setMode]=useState<'original'|'completed'|'compare'>('original');
 useEffect(()=>{let active=true;void loadGapState().then(s=>{if(active)setState(s)});return()=>{active=false}},[]);
 const rows=useMemo(()=>state?approvedRows(data,state,{year,measureId}):[],[data,state,year,measureId]);
 const status=useMemo(()=>state?evaluateApprovals(data,state):[],[data,state]);
 const manual=useMemo(()=>state?manualApprovedRows(data,state,{year,measureId}):[],[data,state,year,measureId]);
 const invalid=status.filter(x=>x.status!=='current');const invalidManual=state?reviewManualApprovals(data,state).filter(x=>x.status!=='current'):[];
 const groups=useMemo(()=>{
  const map=new Map<string,{name:string;total:number;count:number}>();
  for(const r of [...rows,...manual]){const key=r.activity+'|'+r.year+'|'+r.entityId;const old=map.get(key);map.set(key,{name:r.entityName+' · '+r.activity+' · '+r.year,total:(old?.total??0)+r.value,count:(old?.count??0)+1})}
  return [...map.values()].sort((a,b)=>a.name.localeCompare(b.name,'sv'));
 },[rows]);
 return <section className="panel" aria-label="Kompletterad analys" style={{marginTop:18}}>
 <h2>Godkända kompletteringar – separat analys</h2>
 <p className="notice">Utveckling/förvaltning på LO-nivå är en fördelning av redan rapporterade UO-värden, inte nya timmar. Dessa belopp adderas därför aldrig till huvudanalysens total.</p>
 <label>Underlag<select aria-label="Kompletteringsläge" value={mode} onChange={e=>setMode(e.target.value as typeof mode)}><option value="original">Endast original</option><option value="completed">Godkända kompletteringar</option><option value="compare">Jämför original och komplettering</option></select></label>
 {invalidManual.length>0&&<p role="alert">{invalidManual.length} manuella godkännanden behöver granskas på nytt och ingår inte i analysen.</p>}
 {invalid.length>0&&<p role="alert">{invalid.length} tidigare godkända fördelningar behöver granskas på nytt. De är uteslutna ur kompletterad analys.</p>}
 {mode==='original'?<p>Originaldata visas i huvudanalysen ovan. Inga kompletteringar är inkluderade.</p>:groups.length===0?<p>Inga aktuella godkända kompletteringar finns för valt mått och år.</p>:<><p data-testid="completion-summary">{rows.length+manual.length} godkända kompletterade värden · Summa {groups.reduce((a,r)=>a+r.total,0).toLocaleString('sv-SE',{maximumFractionDigits:2})}. Summan representerar en fördelning, inte ytterligare behov.</p>
 {mode==='compare'&&<p>Originalets motsvarande UO-värden finns i utveckling/förvaltning-tabellen. Fördelningsvärdena nedan är en uppdelning av dem.</p>}
 <div style={{overflowX:'auto'}}><table className="analysis-table" aria-label="Godkända fördelningar"><thead><tr><th>LO · aktivitet · år</th><th>Fördelat värde</th></tr></thead><tbody>{groups.map(g=><tr key={g.name}><td>{g.name}</td><td>{g.total.toLocaleString('sv-SE',{maximumFractionDigits:2})}</td></tr>)}</tbody></table></div></>}
 </section>;
}
