import {it,expect} from 'vitest';
import {emptySemantic} from '../domain/semantic';
import {emptyAllocations} from '../allocations/model';
import {emptyPlanning} from '../planning/model';
import {backupToJson,validateBackup,exportFactsCsv} from './format';
it('roundtrips a source-aware project',()=>{
 const semantic=emptySemantic();
 semantic.entities.push({id:'uo',kind:'uo',name:'UO A',aliases:[]});
 semantic.observations.push({id:'o',entityId:'uo',measureId:'it_hours',value:42,period:{year:2027},planningVersion:'2027',scenario:'need',kind:'detail',quality:'reported',source:{datasetId:'d',fileName:'source.xlsx',sheet:'Data',cell:'C2'}});
 const b={format:'utvecklingsanalys-project' as const,version:1 as const,exportedAt:'2026-10-21',project:{schemaVersion:1 as const,id:'p',name:'Demo',datasets:[{id:'d',name:'source',planningYear:2027,importedAt:'2026-10-21',source:'excel' as const}],updatedAt:'2026-10-21'},semantic,planning:emptyPlanning(),configuration:null,legacyAllocations:emptyAllocations()};
 expect(validateBackup(JSON.parse(backupToJson(b)))).toEqual(b);
 expect(exportFactsCsv(semantic)).toContain('source.xlsx');
 expect(()=>validateBackup({...b,project:{...b.project,datasets:[]}})).toThrow('MISSING_DATASET_SUMMARY');
});
