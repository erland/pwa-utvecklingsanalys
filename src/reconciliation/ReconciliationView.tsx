import {useMemo,useState} from 'react';
import type {SemanticDataset} from '../domain/semantic';
import type {GapState} from '../gaps/store';
import {evaluateReconciliations,validateReconciliationRule,type Operand,type ReconciliationRule} from './model';
type Props={data:SemanticDataset;state:GapState;save:(state:GapState)=>Promise<void>};
export default function ReconciliationView({data,state,save}:Props){
 const [name,setName]=useState(''),[measure,setMeasure]=useState('it_hours'),[year,setYear]=useState(2027),[kind,setKind]=useState<'uo'|'lo'>('uo');
 const [leftScope,setLeftScope]=useState<Operand['scope']>('children'),[leftKind,setLeftKind]=useState<Operand['kind']>('detail'),[leftSection,setLeftSection]=useState('');
 const [rightScope,setRightScope]=useState<Operand['scope']>('self'),[rightKind,setRightKind]=useState<Operand['kind']>('subset'),[rightSection,setRightSection]=useState(''),[rightActivities,setRightActivities]=useState('');
 const [absolute,setAbsolute]=useState(0),[relative,setRelative]=useState(1),[reasons,setReasons]=useState<Record<string,string>>({}),[error,setError]=useState('');
 const rules=state.reconciliations??[],decisions=state.reconciliationDecisions??[];
 const results=useMemo(()=>evaluateReconciliations(data,rules,decisions),[data,rules,decisions]);
 const add=()=>{
  const rule:ReconciliationRule={id:crypto.randomUUID(),name,measureId:measure,year,entityKind:kind,left:{scope:leftScope,kind:leftKind,...(leftSection.trim()?{sectionId:leftSection.trim()}:{})},right:{scope:rightScope,kind:rightKind,...(rightSection.trim()?{sectionId:rightSection.trim()}:{}),...(rightActivities.trim()?{activities:rightActivities.split(',').map(x=>x.trim()).filter(Boolean)}:{})},absoluteTolerance:absolute,relativeTolerance:relative/100};
  const issues=validateReconciliationRule(rule,data);
  if(issues.length){setError(issues.join(' · '));return}
  void save({...state,reconciliations:[...rules,rule]});setError('');setName('');
 };
 const accept=(key:string,fingerprint:string)=>{
  const reason=(reasons[key]??'').trim();
  if(!reason){setError('Ange en motivering innan du accepterar avvikelsen.');return}
  void save({...state,reconciliationDecisions:[...decisions.filter(d=>d.key!==key),{key,fingerprint,reason,updatedAt:new Date().toISOString()}]});setError('');
 };
 return <section className="panel"><h2>Avstämning mellan datasektioner</h2><p>Jämför samma summerbara mått och år i två självständigt valda urval. Avvikelser korrigeras aldrig automatiskt. En accepterad avvikelse behöver omprövas om underlaget ändras.</p>
 {error&&<p role="alert">{error}</p>}
 <h3>Ny avstämningsregel</h3>
 <label>Regelnamn<input aria-label="Avstämningsnamn" value={name} onChange={e=>setName(e.target.value)}/></label>
 <label>Mått<select aria-label="Avstämningsmått" value={measure} onChange={e=>setMeasure(e.target.value)}>{data.measures.filter(m=>m.aggregation==='sum').map(m=><option key={m.id} value={m.id}>{m.label}</option>)}</select></label>
 <label>År<input aria-label="Avstämningsår" type="number" value={year} onChange={e=>setYear(Number(e.target.value))}/></label>
 <label>Objektnivå<select aria-label="Avstämningsnivå" value={kind} onChange={e=>setKind(e.target.value as 'uo'|'lo')}><option value="uo">UO</option><option value="lo">LO</option></select></label>
 <fieldset><legend>Vänster jämförelsesida</legend>
 <label>Objekturval<select aria-label="Vänster objektnivå" value={leftScope} onChange={e=>setLeftScope(e.target.value as Operand['scope'])}><option value="children">Underliggande objekt</option><option value="self">Objektet självt</option></select></label>
 <label>Observationstyp<select aria-label="Vänster observationstyp" value={leftKind} onChange={e=>setLeftKind(e.target.value as Operand['kind'])}><option value="detail">Detaljer</option><option value="subset">Fördelning</option><option value="subtotal">Delsumma</option></select></label>
 <label>Sektions-ID (valfritt)<input aria-label="Vänster sektion" value={leftSection} onChange={e=>setLeftSection(e.target.value)}/></label>
 </fieldset>
 <fieldset><legend>Höger jämförelsesida</legend>
 <label>Objekturval<select aria-label="Höger objektnivå" value={rightScope} onChange={e=>setRightScope(e.target.value as Operand['scope'])}><option value="self">Objektet självt</option><option value="children">Underliggande objekt</option></select></label>
 <label>Observationstyp<select aria-label="Höger observationstyp" value={rightKind} onChange={e=>setRightKind(e.target.value as Operand['kind'])}><option value="subset">Fördelning</option><option value="detail">Detaljer</option><option value="subtotal">Delsumma</option></select></label>
 <label>Sektions-ID (valfritt)<input aria-label="Höger sektion" value={rightSection} onChange={e=>setRightSection(e.target.value)}/></label>
 <label>Aktiviteter, kommaseparerade (tomt = alla)<input aria-label="Höger aktiviteter" value={rightActivities} onChange={e=>setRightActivities(e.target.value)}/></label>
 </fieldset>
 <label>Absolut tolerans<input aria-label="Absolut tolerans" type="number" min="0" value={absolute} onChange={e=>setAbsolute(Number(e.target.value))}/></label>
 <label>Relativ tolerans (%)<input aria-label="Relativ tolerans" type="number" min="0" step="0.1" value={relative} onChange={e=>setRelative(Number(e.target.value))}/></label>
 <button className="primary" onClick={add}>Lägg till avstämningsregel</button>
 <h3>Avstämningsresultat</h3>
 {rules.length===0?<p>Inga avstämningsregler definierade.</p>:<>{rules.map(r=><div key={r.id}><strong>{r.name} · {r.year}</strong> <button className="secondary" onClick={()=>{void save({...state,reconciliations:rules.filter(x=>x.id!==r.id),reconciliationDecisions:decisions.filter(d=>!results.some(x=>x.ruleId===r.id&&x.key===d.key))})}}>Ta bort regel</button></div>)}
 <div style={{overflowX:'auto'}}><table className="analysis-table" aria-label="Avstämningsresultat"><thead><tr><th>Regel / objekt</th><th>Vänster</th><th>Höger</th><th>Avvikelse</th><th>Status och beslut</th></tr></thead><tbody>{results.map(x=><tr key={x.key}><td>{rules.find(r=>r.id===x.ruleId)?.name} · {x.entityName}</td><td>{x.left?.toLocaleString('sv-SE')??'Saknas'}</td><td>{x.right?.toLocaleString('sv-SE')??'Saknas'}</td><td>{x.delta?.toLocaleString('sv-SE')??'–'}</td><td>{x.status==='match'?'Överensstämmer':x.status==='missing'?'Kan inte jämföras: en sida saknar data':x.status==='accepted'?'Accepterad avvikelse: '+x.reason:<><span role="alert">Avvikelse kräver beslut</span><p className="notice">Vänster: {x.sources.left.join(', ')}. Höger: {x.sources.right.join(', ')}.</p><label>Motivering<input aria-label={'Avvikelsemotivering '+x.entityName} value={reasons[x.key]??''} onChange={e=>setReasons(v=>({...v,[x.key]:e.target.value}))}/></label><button className="secondary" onClick={()=>accept(x.key,x.fingerprint)}>Acceptera avvikelse</button></>}</td></tr>)}</tbody></table></div></>}
 </section>;
}
