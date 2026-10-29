import {annualTotals} from './annualTotals';
import type {TrendPoint} from './canonicalTrend';
import type {Metric} from '../domain/canonical';

export default function AnnualTrendReport({trend,metrics}:{trend:TrendPoint[];metrics:Metric[]}){
 const rows=annualTotals(trend,metrics);
 const fmt=(n:number)=>new Intl.NumberFormat('sv-SE',{maximumFractionDigits:2}).format(n);
 const max=Math.max(1,...rows.map(r=>r.value));
 const minYear=rows[0]?.year??0,maxYear=rows.at(-1)?.year??0;
 const x=(year:number)=>40+(maxYear===minYear?180:(year-minYear)/(maxYear-minYear)*360);
 const y=(value:number)=>170-value/max*130;
 const line=rows.map((r,i)=>`${i?'L':'M'} ${x(r.year)} ${y(r.value)}`).join(' ');
 const unit=rows[0]?.unit??'h';
 return <section aria-label="Årsvis utveckling för valt organisationsurval">
  <h3>Årsvis utveckling</h3>
  <p>Trend för valda mått och aktiviteter. Tabellen visar samma årsvärden samt förändringen mot närmast föregående kalenderår. Saknade år antas aldrig vara noll.</p>
  {rows.length>0&&<svg className="annual-line-chart" viewBox="0 0 440 210" role="img" aria-label={'Linjediagram för årsvis utveckling i '+(unit==='h'?'timmar':'kronor')}>
   <line x1="40" y1="170" x2="400" y2="170" stroke="#8295a2" strokeWidth="1"/>
   <line x1="40" y1="40" x2="40" y2="170" stroke="#8295a2" strokeWidth="1"/>
   <text x="36" y="42" textAnchor="end" fontSize="11" fill="currentColor">{fmt(max)}</text>
   <text x="36" y="174" textAnchor="end" fontSize="11" fill="currentColor">0</text>
   {rows.length>1&&<path d={line} fill="none" stroke="#087e79" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"/>}
   {rows.map(r=><g key={r.year}>
    <circle cx={x(r.year)} cy={y(r.value)} r="4.5" fill="#087e79"/>
    <text x={x(r.year)} y="192" textAnchor="middle" fontSize="12" fill="currentColor">{r.year}</text>
    <title>{r.year}: {fmt(r.value)} {unit}</title>
   </g>)}
  </svg>}
  {rows.length>0?<div style={{overflowX:'auto'}}><table className="canonical-table" aria-label="Årsvis utveckling och förändring"><thead><tr><th>År</th><th>{unit==='h'?'Timmar':'Kostnad'}</th><th>Förändring</th><th>Förändring %</th></tr></thead>
   <tbody>{rows.map(r=><tr key={r.year}><th scope="row">{r.year}</th><td>{fmt(r.value)} {r.unit}{r.missingMetrics.length>0?' *':''}</td><td>{r.difference===null?'–':(r.difference>0?'+':'')+fmt(r.difference)+' '+r.unit}</td><td>{r.difference===null?'–':r.percent===null?'Ej beräkningsbar':(r.percent>0?'+':'')+fmt(r.percent)+' %'}{r.incompleteComparison?' *':''}</td></tr>)}</tbody>
  </table></div>:<p>Inga årsvärden för aktuellt urval.</p>}
  {rows.some(r=>r.missingMetrics.length||r.unknownCount||r.staleApprovals||r.incompleteComparison)&&<p role="status" className="notice">* Vissa år saknar valda mått, har ofullständig aktivitetstäckning eller inaktuella godkännanden. Siffror och förändringar omfattar endast tillgängliga och godkända uppgifter och är inte alltid fullt jämförbara.</p>}
 </section>;
}
