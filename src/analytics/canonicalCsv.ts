import type {CanonicalAnalysisResult} from './canonicalQuery';
import type {TrendPoint} from './canonicalTrend';
import {compareTrend} from './canonicalComparison';

/** Semicolon-delimited UTF-8 data intended for Swedish Excel; no source records are modified. */
const quote=(value:string|number)=>'"'+String(value).replace(/"/g,'""')+'"';
const row=(values:(string|number)[])=>values.map(quote).join(';');
const safe=(value:string)=>/^[=+@\t\r-]/.test(value)?'\''+value:value;
export function canonicalCsv(result:CanonicalAnalysisResult,trend:TrendPoint[]):string{
 const lines=[
  row(['Sektion','År/från','Till','Mått/organisation','Värde','Enhet','Förändring','Procent','Status']),
  ...result.rows.map(r=>row(['Organisationsdel','','',safe(r.label),r.value,result.unit,'','',''])),
  ...trend.map(p=>row(['Årstrend',p.year,'',p.metric,p.value,p.unit,'','',p.unknownCount||p.staleApprovals?'Ofullständig täckning':''])),
  ...compareTrend(trend).map(c=>row(['Årsjämförelse',c.fromYear,c.toYear,c.metric,c.to,c.unit,c.difference,c.percent===null?'':c.percent,c.incomplete?'Ofullständig täckning':'']))
 ];
 return '\uFEFF'+lines.join('\r\n')+'\r\n';
}
