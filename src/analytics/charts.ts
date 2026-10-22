import type {Result,Row} from './query';
export type ChartType='bar'|'pie'|'table';
export function pieEligibility(result:Result):string|null{
 if(result.rows.length===0)return 'Inga värden att visa i cirkeldiagram.';
 if(result.total<=0||!Number.isFinite(result.total))return 'Cirkeldiagram kräver en positiv total.';
 if(result.rows.some(r=>r.value<0||!Number.isFinite(r.value)))return 'Cirkeldiagram kan inte visa negativa eller ogiltiga värden.';
 return null;
}
export function pieSlices(result:Result):{row:Row;percentage:number;start:number;end:number}[]{
 if(pieEligibility(result))return [];
 let offset=0;
 return result.rows.map(row=>{const start=offset;const percentage=100*row.value/result.total;offset+=percentage;return {row,percentage,start,end:offset};});
}
export const CHART_COLORS=['#12766b','#355e9b','#ba6222','#7a4b94','#94751a','#2d8294','#904d67','#526c2d'];
