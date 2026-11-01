import {costTypes,costTypeSummary,costTypeYears} from './costTypeAnalysis';
import type {CanonicalDataset} from '../domain/canonical';
import type {GapState} from '../gaps/store';
import type {CanonicalAnalysisQuery} from './canonicalQuery';

export default function CostTypeAnalysis({data,state,query,showTrend}:{data:CanonicalDataset;state:GapState;query:CanonicalAnalysisQuery;showTrend:boolean}){
 const selected=costTypes.filter(type=>query.metrics.includes(type.metric));
 const rows=costTypeSummary(data,state,query).filter(row=>query.metrics.includes(row.metric));
 const years=costTypeYears(data,state,query).map(row=>({...row,total:row.values.reduce<number>((sum,value,i)=>selected.some(type=>type.metric===costTypes[i].metric)?sum+(value??0):sum,0)}));
 const total=rows.reduce((sum,row)=>sum+row.value,0);
 const fmt=(n:number)=>new Intl.NumberFormat('sv-SE',{maximumFractionDigits:2}).format(n);
 const colors=['#2563eb','#0d9488'];
 const share=total>0?100*(rows.find(row=>row.metric==='consultant_cost')?.value??0)/total:0;
 const max=Math.max(1,...years.flatMap(r=>r.values.filter((v):v is number=>v!==null)));
 const x=(index:number)=>40+(years.length<=1?180:index/(years.length-1)*360);
 const y=(value:number)=>170-value/max*130;
 const lines=costTypes.filter(type=>selected.some(s=>s.metric===type.metric)).map(type=>{const index=costTypes.findIndex(t=>t.metric===type.metric);
  const fragments:string[]=[];let started=false;
  years.forEach((entry,i)=>{
   const value=entry.values[index];
   if(value===null){started=false;return}
   fragments.push((started?'L':'M')+' '+x(i)+' '+y(value));started=true;
  });
  return {type,path:fragments.join(' '),color:colors[index]};
 });
 return <section className="panel" aria-label="Analys av kostnadsslag">
  <h3>Kostnader per kostnadsslag</h3>
  <p>Produktkonsulter och övriga omkostnader i vald organisation och period. Beloppen är separata och räknas inte två gånger.</p>
  <p><strong>Totalt: {fmt(total)} kr</strong></p>
  {total>0&&<div style={{display:'flex',gap:24,alignItems:'center',flexWrap:'wrap'}}>
   <div role="img" aria-label={'Kostnadsslag: '+rows.map(row=>row.label+' '+fmt(row.value)+' kr').join(', ')} style={{width:160,height:160,borderRadius:'50%',background:selected.length===1?colors[costTypes.findIndex(t=>t.metric===selected[0].metric)]:'conic-gradient('+colors[0]+' 0% '+share+'%, '+colors[1]+' '+share+'% 100%)'}}/>
   <div>{rows.map((row,i)=><p key={row.metric}><span aria-hidden="true" style={{display:'inline-block',width:12,height:12,marginRight:8,background:colors[costTypes.findIndex(t=>t.metric===row.metric)]}}/>{row.label}: {fmt(row.value)} kr ({fmt(total?row.value/total*100:0)} %)</p>)}</div>
  </div>}
  <table className="canonical-table" aria-label="Kostnadsslag"><thead><tr><th>Kostnadsslag</th><th>Belopp</th><th>Andel</th></tr></thead><tbody>{rows.map(row=><tr key={row.metric}><th scope="row">{row.label}</th><td>{fmt(row.value)} kr</td><td>{fmt(total?row.value/total*100:0)} %</td></tr>)}</tbody><tfoot><tr><th scope="row">Totalt</th><td>{fmt(total)} kr</td><td>{total>0?'100 %':'–'}</td></tr></tfoot></table>
  {showTrend&&years.length>1&&<section aria-label="Kostnadsutveckling per kostnadsslag">
   <h3>Kostnadsutveckling per kostnadsslag</h3>
   <p>Årsbelopp och förändringar från föregående år. Saknade värden visas som streck, inte noll.</p>
   <svg className="annual-line-chart" viewBox="0 0 440 210" role="img" aria-label="Linjediagram för produktkonsulter och övriga omkostnader">
    <line x1="40" y1="170" x2="400" y2="170" stroke="#8295a2"/><line x1="40" y1="40" x2="40" y2="170" stroke="#8295a2"/>
    {lines.map(line=><path key={line.type.metric} d={line.path} fill="none" stroke={line.color} strokeWidth="3"/>)}
    {years.map((row,i)=><text key={row.year} x={x(i)} y="192" textAnchor="middle" fill="currentColor" fontSize="12">{row.year}</text>)}
   </svg>
   <div style={{overflowX:'auto'}}><table className="canonical-table" aria-label="Årliga kostnader per kostnadsslag"><thead><tr><th>År</th>{selected.map(t=><th key={t.metric}>{t.label}</th>)}<th>Totalt</th><th>Förändring</th><th>Förändring %</th></tr></thead><tbody>{years.map((row,index)=>{
    const previous=years[index-1];const delta=row.total!==null&&previous?.total!==null&&previous?.total!==undefined&&previous.year===row.year-1?row.total-previous.total:null;
    return <tr key={row.year}><th scope="row">{row.year}</th>{row.values.map((value,i)=>({value,metric:costTypes[i].metric})).filter(item=>selected.some(t=>t.metric===item.metric)).map(item=><td key={item.metric}>{item.value===null?'–':fmt(item.value)+' kr'}</td>)}<td>{row.total===null?'–':fmt(row.total)+' kr'}</td><td>{delta===null?'–':fmt(delta)+' kr'}</td><td>{delta===null||!previous?.total?'–':fmt(100*delta/previous.total)+' %'}</td></tr>;
   })}</tbody></table></div>
  </section>}
 </section>;
}
