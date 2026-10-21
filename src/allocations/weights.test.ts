import {test,expect} from 'vitest';
import {emptySemantic} from '../domain/semantic';
import {weightsFromSemantic} from './weights';
test('sums additive LO hours once per source cell',()=>{
 const d=emptySemantic();const base={entityId:'lo',measureId:'business_hours',value:40,period:{year:2027},planningVersion:'2027',scenario:'reported',source:{datasetId:'d',fileName:'a.xlsx',sheet:'X',cell:'C2'},kind:'detail' as const,quality:'reported' as const};
 d.observations=[{...base,id:'1'},{...base,id:'2'},{...base,id:'3',kind:'subtotal',value:200}];
 expect(weightsFromSemantic(d,'business_hours',2027,['lo'])).toEqual({lo:40});
});
test('rejects multiple snapshots rather than summing staffing',()=>{
 const d=emptySemantic();const base={entityId:'lo',measureId:'fte',value:4,period:{year:2027},planningVersion:'2027',scenario:'reported',source:{datasetId:'d',fileName:'a.xlsx',sheet:'X',cell:'C2'},kind:'detail' as const,quality:'reported' as const};
 d.observations=[{...base,id:'1'},{...base,id:'2',source:{...base.source,cell:'C3'}}];
 expect(()=>weightsFromSemantic(d,'fte',2027,['lo'])).toThrow('AMBIGUOUS_SNAPSHOT_SOURCES');
});
