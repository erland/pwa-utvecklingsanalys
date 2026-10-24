import {previewActivityAllocation} from '../domain/activityAllocation';
import {validateCanonical,type CanonicalDataset} from '../domain/canonical';
import {validateReconciliationRule} from '../reconciliation/model';
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

export interface ArchivedRevision {id:string;createdAt:string;reason:string;data:ConfigPackage}
export interface ProjectBackup {
 format:'utvecklingsanalys-project';version:1|2|3;exportedAt:string;
 project:AnalysisProject;semantic:SemanticDataset;planning:PlanningState;configuration:ConfigPackage|null;legacyAllocations:Allocations;drafts?:unknown[];configurationHistory?:ArchivedRevision[];gapState?:GapState;canonical?:CanonicalDataset;
}
export function validateBackup(input:unknown):ProjectBackup{
 if(!input||typeof input!=='object')throw new Error('INVALID_BACKUP');
 const b=input as ProjectBackup;
 if(b.format!=='utvecklingsanalys-project'||b.version!==1&&b.version!==2&&b.version!==3)throw new Error('UNSUPPORTED_BACKUP_VERSION');
 if(!b.project||b.project.schemaVersion!==1||typeof b.project.id!=='string'||typeof b.project.name!=='string'||!Array.isArray(b.project.datasets))throw new Error('INVALID_PROJECT');
 migrateSemantic(b.semantic);
 if(!b.planning||b.planning.schemaVersion!==1||!Array.isArray(b.planning.scenarios))throw new Error('INVALID_PLANNING');
 if(b.configuration!==null)parsePackage(b.configuration);
 if(!b.legacyAllocations||validateAllocation(b.legacyAllocations).length||b.legacyAllocations.schemaVersion!==1)throw new Error('INVALID_ALLOCATIONS');
 if(b.version>=2){
  if(!Array.isArray(b.drafts)||!Array.isArray(b.configurationHistory))throw new Error('INCOMPLETE_PROJECT_ARCHIVE');
  for(const h of b.configurationHistory)if(!h.id||!h.createdAt||!h.reason)throw new Error('INVALID_REVISION');else parsePackage(h.data);
 }
 if(b.gapState){if(!Array.isArray(b.gapState.requirements)||!Array.isArray(b.gapState.resolutions)||b.gapState.requirements.some(r=>validateRequirement(r,b.semantic).length)||b.gapState.resolutions.some(r=>validateResolution(r).length))throw new Error('INVALID_GAP_STATE');}
 if(b.gapState?.rules){const keys=new Set<string>();for(const rule of b.gapState.rules){if(!rule.id||keys.has(rule.id)||!b.gapState.requirements.some(req=>req.id===rule.requirementId&&req.entityKind==='lo'&&req.years.includes(rule.year)&&req.activities.includes(rule.activity))||!b.semantic.measures.some(m=>m.id===rule.weightMeasureId)||!rule.reason.trim()||(rule.uoId!==undefined&&!b.semantic.entities.some(e=>e.id===rule.uoId&&e.kind==='uo')))throw new Error('INVALID_DISTRIBUTION_RULE');keys.add(rule.id)}}
 if(b.gapState?.approvals){
  const ids=new Set<string>();
  for(const a of b.gapState.approvals){
   if(!a.ruleId||ids.has(a.ruleId)||!a.fingerprint||!a.approvedAt||!Array.isArray(a.items)||!Array.isArray(b.gapState.rules)||!b.gapState.rules.some(r=>r.id===a.ruleId)||a.items.some(i=>!i.key||!i.entityId||!Number.isFinite(i.value)))throw new Error('INVALID_DISTRIBUTION_APPROVAL');
   ids.add(a.ruleId);
  }
 }
 if(b.gapState?.manualApprovals){const seen=new Set<string>();for(const a of b.gapState.manualApprovals){if(!a.key||seen.has(a.key)||!a.resolutionUpdatedAt||!a.approvedAt||!b.gapState.resolutions.some(r=>r.key===a.key&&r.status==='manual'))throw new Error('INVALID_MANUAL_APPROVAL');seen.add(a.key)}}
 if(b.gapState?.reconciliations){const names=new Set<string>();for(const rule of b.gapState.reconciliations){if(names.has(rule.id)||validateReconciliationRule(rule,b.semantic).length)throw new Error('INVALID_RECONCILIATION_RULE');names.add(rule.id)}}
 if(b.gapState?.reconciliationDecisions){const keys=new Set<string>();for(const decision of b.gapState.reconciliationDecisions){if(!decision.key||keys.has(decision.key)||!decision.fingerprint||!decision.reason?.trim()||!decision.updatedAt)throw new Error('INVALID_RECONCILIATION_DECISION');keys.add(decision.key)}}
 if(b.version===3&&(!b.canonical||validateCanonical(b.canonical).length))throw new Error('INVALID_CANONICAL_BACKUP');
 if(b.gapState?.activityAllocationRules||b.gapState?.activityAllocationDecisions){
  if(b.version!==3||!b.canonical)throw new Error('ACTIVITY_ALLOCATIONS_REQUIRE_V3');
  const rules=b.gapState?.activityAllocationRules??[],decisions=b.gapState?.activityAllocationDecisions??[];
  const ids=new Set<string>();
  for(const rule of rules){
   if(!rule.id||ids.has(rule.id)||!rule.reason?.trim()||!rule.datasetId||!rule.uoId||!Number.isInteger(rule.year)||!['it_hours','business_hours'].includes(rule.metric))throw new Error('INVALID_ACTIVITY_ALLOCATION_RULE');
   ids.add(rule.id);
  }
  const decided=new Set<string>();
  for(const decision of decisions){
   if(!ids.has(decision.ruleId)||decided.has(decision.ruleId)||!decision.fingerprint||!decision.approvedAt||!decision.reason?.trim())throw new Error('INVALID_ACTIVITY_ALLOCATION_DECISION');
   decided.add(decision.ruleId);
  }
  // Import of an otherwise well-formed historic approval is permitted; the live projection
  // re-evaluates the fingerprint against actual source data and treats stale approvals as inactive.
  for(const rule of rules)try{previewActivityAllocation(b.canonical,rule)}catch{/* historic or stale rule; keep for review */}
 }

 const datasets=new Set(b.project.datasets.map(x=>x.id));
 if(b.version===3)for(const row of b.canonical!.records)if(row.source&&!datasets.has(row.source.datasetId))throw new Error('MISSING_CANONICAL_SOURCE');
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
