import {it,expect} from 'vitest';
import {emptySemantic} from '../domain/semantic';
import {emptyCanonical} from '../domain/canonical';
import {emptyAllocations} from '../allocations/model';
import {emptyPlanning} from '../planning/model';
import {backupToJson,validateBackup,exportFactsCsv} from './format';
import {buildPackage} from '../config/packages';
import type {OptionalAllocations} from '../allocations/optionalModel';
it('roundtrips a source-aware project',()=>{
 const semantic=emptySemantic();
 semantic.entities.push({id:'uo',kind:'uo',name:'UO A',aliases:[]});
 semantic.observations.push({id:'o',entityId:'uo',measureId:'it_hours',value:42,period:{year:2027},planningVersion:'2027',scenario:'need',kind:'detail',quality:'reported',source:{datasetId:'d',fileName:'source.xlsx',sheet:'Data',cell:'C2'}});
 const b={format:'utvecklingsanalys-project' as const,version:1 as const,exportedAt:'2026-10-21',project:{schemaVersion:1 as const,id:'p',name:'Demo',datasets:[{id:'d',name:'source',planningYear:2027,importedAt:'2026-10-21',source:'excel' as const}],updatedAt:'2026-10-21'},semantic,planning:emptyPlanning(),configuration:null,legacyAllocations:emptyAllocations()};
 expect(validateBackup(JSON.parse(backupToJson(b)))).toEqual(b);
 const extended={...b,version:2 as const,drafts:[{id:'draft',fileName:'original.xlsx',bytesBase64:'AQIDBA==',result:{facts:[],issues:[],profile:'uo-budget-2027-v1',uo:'UO A',excludedSheets:[]},uoName:'UO A',status:'review' as const,updatedAt:'2026-10-21'}],configurationHistory:[]};
 expect(validateBackup(JSON.parse(backupToJson(extended)))).toEqual(extended);
 expect(validateBackup({...extended,drafts:[{...extended.drafts[0],bytesBase64:'bad%'}]}).drafts).toHaveLength(1);
 const canonical={...emptyCanonical(),records:[{id:'v2-cell',metric:'it_hours' as const,value:42,year:2027,activity:'unknown' as const,scope:{axis:'work' as const,uoId:'uo'},authority:'original' as const,approval:'reported' as const,workloadId:'workload',granularity:'total' as const,source:{datasetId:'d',sheet:'Data',cell:'C2'}}]};
 const v3={...extended,version:3 as const,canonical};
 expect(validateBackup(JSON.parse(backupToJson(v3)))).toEqual(v3);

 const optional:OptionalAllocations={schemaVersion:2,dimensions:[{id:'impact',name:'Effekt',categories:[{id:'direct',name:'Direkt effekt'},{id:'indirect',name:'Förutsättningar'}],appliesTo:{metrics:['it_hours'],activities:'all'}}],rules:[{dimensionId:'impact',year:2027,scope:{kind:'uo',uoId:'uo'},percentages:{direct:70,indirect:20}}]};
 const configuration=buildPackage(emptyAllocations(),undefined,'full-configuration',undefined,optional);
 const withOptional={...v3,configuration,configurationHistory:[{id:'revision-1',reason:'Saved impact allocation',createdAt:'2026-10-30',data:configuration}]};
 const restored=validateBackup(JSON.parse(backupToJson(withOptional)));
 expect(restored.configuration?.sections.optionalAllocations).toEqual(optional);
 expect(restored.configurationHistory?.[0].data.sections.optionalAllocations).toEqual(optional);
 expect(()=>validateBackup({...withOptional,configuration:{...configuration,sections:{...configuration.sections,optionalAllocations:{...optional,rules:[{...optional.rules[0],percentages:{direct:110}}]}}}})).toThrow('INVALID_PERCENT');

 const allocations={...v3,gapState:{requirements:[],resolutions:[],activityAllocationRules:[{id:'v2rule',datasetId:'d',uoId:'uo',metric:'it_hours' as const,year:2027,reason:'LO proportions'}],activityAllocationDecisions:[{ruleId:'v2rule',fingerprint:'source-fingerprint',approvedAt:'2026-10-23',reason:'Reviewed'}]}};
 expect(validateBackup(JSON.parse(backupToJson(allocations)))).toEqual(allocations);
 expect(()=>validateBackup({...allocations,gapState:{...allocations.gapState,activityAllocationDecisions:[{...allocations.gapState.activityAllocationDecisions[0],reason:''}]}})).toThrow('INVALID_ACTIVITY_ALLOCATION_DECISION');
 expect(()=>validateBackup({...extended,gapState:allocations.gapState})).toThrow('ACTIVITY_ALLOCATIONS_REQUIRE_V3');
 expect(()=>validateBackup({...v3,canonical:{...canonical,records:[{...canonical.records[0],source:{datasetId:'unknown',sheet:'Data',cell:'C2'}}]}})).toThrow('MISSING_CANONICAL_SOURCE');
 expect(()=>validateBackup({...v3,canonical:undefined})).toThrow('INVALID_CANONICAL_BACKUP');
 expect(exportFactsCsv(semantic)).toContain('source.xlsx');
 expect(()=>validateBackup({...b,project:{...b.project,datasets:[]}})).toThrow('MISSING_DATASET_SUMMARY');
});
