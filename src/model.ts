/** Stable starter contracts. Detailed import and semantic models are introduced in DEV-002/004. */
export type ViewId = 'overview'|'import'|'analysis'|'groups'|'relations'|'settings';
export interface DatasetSummary { id: string; name: string; planningYear: number; importedAt: string; source: 'demo'|'excel'; }
export interface AnalysisProject { schemaVersion: 1; id: string; name: string; datasets: DatasetSummary[]; updatedAt: string; }
export const emptyProject = (): AnalysisProject => ({schemaVersion:1,id:crypto.randomUUID(),name:'Mitt analysprojekt',datasets:[],updatedAt:new Date().toISOString()});
export interface DemoUnit { id:string; group:string; itDevelopment:number; itOther:number; businessDevelopment:number; businessOther:number; }
export const DEMO_UNITS: DemoUnit[] = [
{id:'UO A',group:'Grupp 1',itDevelopment:4100,itOther:800,businessDevelopment:1200,businessOther:400},
{id:'UO B',group:'Grupp 1',itDevelopment:2400,itOther:600,businessDevelopment:1600,businessOther:200},
{id:'UO C',group:'Grupp 2',itDevelopment:5000,itOther:900,businessDevelopment:2200,businessOther:600},
{id:'UO D',group:'Grupp 2',itDevelopment:3000,itOther:1200,businessDevelopment:1800,businessOther:400}
];
export type ResourceFilter='all'|'it'|'business';
export type WorkFilter='all'|'development'|'other';
export function unitHours(d:DemoUnit,r:ResourceFilter,w:WorkFilter){return (r!=='business'?(w==='other'?0:d.itDevelopment)+(w==='development'?0:d.itOther):0)+(r!=='it'?(w==='other'?0:d.businessDevelopment)+(w==='development'?0:d.businessOther):0);}
export function aggregate(units:DemoUnit[],resource:ResourceFilter,work:WorkFilter,groupBy:'group'|'unit'){
 const sums=new Map<string,number>();for(const u of units){const key=groupBy==='group'?u.group:u.id;sums.set(key,(sums.get(key)??0)+unitHours(u,resource,work));}return [...sums].map(([label,hours])=>({label,hours})).sort((a,b)=>b.hours-a.hours);
}
