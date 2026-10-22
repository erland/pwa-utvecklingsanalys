import type {GapState} from '../gaps/store';
import {validateResolution,validateRequirement} from '../gaps/model';
import type {AnalysisProject} from '../model';
import type {SemanticDataset} from '../domain/semantic';
import {migrateSemantic} from '../domain/semantic';
import type {PlanningState} from '../planning/model';
import type {ConfigPackage} from '../config/packages';
import {parsePackage} from '../config/packages';
import type {Allocations} from '../allocations/model';
import {validateAllocation} from '../allocations/model';

export interface ArchivedDraft {id:string;fileName:string;bytesBase64:string;result:import('../import/uoBudget').ImportResult;uoName:string;status:'review'|'ready';updatedAt:string;mapping?:import('../import/uoBudget').Mapping}
export interface ArchivedRevision {id:string;createdAt:string;reason:string;data:ConfigPackage}
export interface ProjectBackup {
 format:'utvecklingsanalys-project';version:1|2;exportedAt:string;
 project:AnalysisProject;semantic:SemanticDataset;planning:PlanningState;configuration:ConfigPackage|null;legacyAllocations:Allocations;drafts?:ArchivedDraft[];configurationHistory?:ArchivedRevision[];gapState?:GapState;
}
export function validateBackup(input:unknown):ProjectBackup{
 if(!input||typeof input!=='object')throw new Error('INVALID_BACKUP');
 const b=input as ProjectBackup;
 if(b.format!=='utvecklingsanalys-project'||b.version!==1&&b.version!==2)throw new Error('UNSUPPORTED_BACKUP_VERSION');
 if(!b.project||b.project.schemaVersion!==1||typeof b.project.id!=='string'||typeof b.project.name!=='string'||!Array.isArray(b.project.datasets))throw new Error('INVALID_PROJECT');
 migrateSemantic(b.semantic);
 if(!b.planning||b.planning.schemaVersion!==1||!Array.isArray(b.planning.scenarios))throw new Error('INVALID_PLANNING');
 if(b.configuration!==null)parsePackage(b.configuration);
 if(!b.legacyAllocations||validateAllocation(b.legacyAllocations).length||b.legacyAllocations.schemaVersion!==1)throw new Error('INVALID_ALLOCATIONS');
 if(b.version===2){
  if(!Array.isArray(b.drafts)||!Array.isArray(b.configurationHistory))throw new Error('INCOMPLETE_PROJECT_ARCHIVE');
  const unique=new Set<string>();
  for(const d of b.drafts){
   if(!d||typeof d.id!=='string'||unique.has(d.id)||typeof d.fileName!=='string'||typeof d.bytesBase64!=='string'||!/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(d.bytesBase64)||!d.result||!Array.isArray(d.result.facts)||!Array.isArray(d.result.issues)||!['review','ready'].includes(d.status))throw new Error('INVALID_DRAFT');
   unique.add(d.id);
  }
  for(const h of b.configurationHistory)if(!h.id||!h.createdAt||!h.reason)throw new Error('INVALID_REVISION');else parsePackage(h.data);
 }
 if(b.gapState){if(!Array.isArray(b.gapState.requirements)||!Array.isArray(b.gapState.resolutions)||b.gapState.requirements.some(r=>validateRequirement(r,b.semantic).length)||b.gapState.resolutions.some(r=>validateResolution(r).length))throw new Error('INVALID_GAP_STATE');}
 if(b.gapState?.rules){const keys=new Set<string>();for(const rule of b.gapState.rules){if(!rule.id||keys.has(rule.id)||!b.gapState.requirements.some(req=>req.id===rule.requirementId&&req.entityKind==='lo'&&req.years.includes(rule.year)&&req.activities.includes(rule.activity))||!b.semantic.measures.some(m=>m.id===rule.weightMeasureId)||!rule.reason.trim())throw new Error('INVALID_DISTRIBUTION_RULE');keys.add(rule.id)}}
 if(b.gapState?.approvals){
  const ids=new Set<string>();
  for(const a of b.gapState.approvals){
   if(!a.ruleId||ids.has(a.ruleId)||!a.fingerprint||!a.approvedAt||!Array.isArray(a.items)||!Array.isArray(b.gapState.rules)||!b.gapState.rules.some(r=>r.id===a.ruleId)||a.items.some(i=>!i.key||!i.entityId||!Number.isFinite(i.value)))throw new Error('INVALID_DISTRIBUTION_APPROVAL');
   ids.add(a.ruleId);
  }
 }
 if(b.gapState?.manualApprovals){const seen=new Set<string>();for(const a of b.gapState.manualApprovals){if(!a.key||seen.has(a.key)||!a.resolutionUpdatedAt||!a.approvedAt||!b.gapState.resolutions.some(r=>r.key===a.key&&r.status==='manual'))throw new Error('INVALID_MANUAL_APPROVAL');seen.add(a.key)}}
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
