import type {AnalysisProject} from '../model';
import type {SemanticDataset} from '../domain/semantic';
import {migrateSemantic} from '../domain/semantic';
import type {PlanningState} from '../planning/model';
import type {ConfigPackage} from '../config/packages';
import {parsePackage} from '../config/packages';
import type {Allocations} from '../allocations/model';
import {validateAllocation} from '../allocations/model';

export interface ProjectBackup {
 format:'utvecklingsanalys-project';version:1;exportedAt:string;
 project:AnalysisProject;semantic:SemanticDataset;planning:PlanningState;configuration:ConfigPackage|null;legacyAllocations:Allocations;
}
export function validateBackup(input:unknown):ProjectBackup{
 if(!input||typeof input!=='object')throw new Error('INVALID_BACKUP');
 const b=input as ProjectBackup;
 if(b.format!=='utvecklingsanalys-project'||b.version!==1)throw new Error('UNSUPPORTED_BACKUP_VERSION');
 if(!b.project||b.project.schemaVersion!==1||typeof b.project.id!=='string'||typeof b.project.name!=='string'||!Array.isArray(b.project.datasets))throw new Error('INVALID_PROJECT');
 migrateSemantic(b.semantic);
 if(!b.planning||b.planning.schemaVersion!==1||!Array.isArray(b.planning.scenarios))throw new Error('INVALID_PLANNING');
 if(b.configuration!==null)parsePackage(b.configuration);
 if(!b.legacyAllocations||validateAllocation(b.legacyAllocations).length||b.legacyAllocations.schemaVersion!==1)throw new Error('INVALID_ALLOCATIONS');
 const datasets=new Set(b.project.datasets.map(x=>x.id));
 for(const o of b.semantic.observations)if(!datasets.has(o.source.datasetId))throw new Error('MISSING_DATASET_SUMMARY');
 const ids=new Set(b.semantic.observations.map(o=>o.id));
 for(const scenario of b.planning.scenarios){if(!scenario.id||!['draft','approved'].includes(scenario.status)||!Array.isArray(scenario.adjustments)||scenario.adjustments.some(a=>!ids.has(a.observationId)||!Number.isFinite(a.value)))throw new Error('INVALID_SCENARIO_REFERENCE');}
 return b;
}
export function backupToJson(backup:ProjectBackup):string{return JSON.stringify(validateBackup(backup),null,2)}
export function exportFactsCsv(data:SemanticDataset):string{
 const headers=['dataset','file','sheet','cell','entity','measure','year','month','value','scenario','version','kind'];
 const quote=(s:string)=>'"'+s.replace(/"/g,'""')+'"';
 const rows=data.observations.map(o=>[o.source.datasetId,o.source.fileName,o.source.sheet,o.source.cell,o.entityId,o.measureId,String(o.period.year),String(o.period.month??''),String(o.value),o.scenario,o.planningVersion,o.kind].map(quote).join(','));
 return [headers.map(quote).join(','),...rows].join('\r\n')+'\r\n';
}

export async function exportFactsXlsx(data:SemanticDataset):Promise<ArrayBuffer>{
 const {default:ExcelJS}=await import('exceljs');const workbook=new ExcelJS.Workbook();const sheet=workbook.addWorksheet('Observationer');
 sheet.addRow(['Dataset','Fil','Blad','Cell','Objekt','Mått','År','Månad','Värde','Scenario','Version','Typ']);
 for(const o of data.observations)sheet.addRow([o.source.datasetId,o.source.fileName,o.source.sheet,o.source.cell,o.entityId,o.measureId,o.period.year,o.period.month??'',o.value,o.scenario,o.planningVersion,o.kind]);
 sheet.getRow(1).font={bold:true};sheet.views=[{state:'frozen',ySplit:1}];return workbook.xlsx.writeBuffer() as Promise<ArrayBuffer>;
}
