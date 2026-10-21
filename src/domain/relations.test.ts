import {describe,it,expect} from 'vitest';
import {emptySemantic,type SemanticDataset} from './semantic';
import {activeRelation,addRelation,checkRelation,processReach} from './relations';
function fixture():SemanticDataset{
 const d=emptySemantic();
 d.entities=[{id:'u1',kind:'uo',name:'UO A',aliases:[]},{id:'u2',kind:'uo',name:'UO B',aliases:[]},{id:'lo',kind:'lo',name:'LO 1',aliases:[],parentId:'u1'},{id:'p1',kind:'process',name:'Process A',aliases:[]},{id:'p2',kind:'process',name:'Process B',aliases:[]},{id:'dep',kind:'department',name:'Avdelning A',aliases:[]}];
 d.relations=[{id:'a',type:'supports',fromId:'u1',toId:'p1',validFrom:'2026-01-01'},{id:'b',type:'supports',fromId:'lo',toId:'p1',validFrom:'2026-01-01'},{id:'c',type:'supports',fromId:'u2',toId:'p1',validFrom:'2026-01-01'},{id:'d',type:'performs',fromId:'dep',toId:'p1',validFrom:'2026-01-01'},{id:'e',type:'supports',fromId:'u1',toId:'p2',validFrom:'2028-01-01'}];
 d.observations=[{id:'o',entityId:'p1',measureId:'business_hours',value:120,period:{year:2027},planningVersion:'2027',scenario:'reported',kind:'detail',quality:'reported',source:{datasetId:'f',fileName:'a.xlsx',sheet:'Data',cell:'C2'}}];
 return d;
}
describe('dated relation contract',()=>{
 it('rejects incorrect endpoints, types, dates and cycles',()=>{
  const d=fixture();expect(checkRelation(d,{fromId:'dep',toId:'u1',type:'performs',validFrom:'2027-01-01'})).toContain('INVALID_RELATION_TYPES');
  expect(checkRelation(d,{fromId:'u1',toId:'p1',type:'supports',validFrom:'2027-02-30'})).toContain('INVALID_DATE');
  expect(checkRelation(d,{fromId:'u1',toId:'p1',type:'supports',validFrom:'2028-01-01',validTo:'2027-01-01'})).toContain('INVALID_INTERVAL');
 });
 it('uses inclusive validity boundaries',()=>{const r={id:'a',fromId:'u1',toId:'p1',type:'supports' as const,validFrom:'2027-01-01',validTo:'2027-12-31'};expect(activeRelation(r,'2027-12-31')).toBe(true);expect(activeRelation(r,'2028-01-01')).toBe(false)});
 it('counts distinct processes and source hours with overlapping UO and LO paths',()=>{
  const d=fixture();const a=processReach(d,2027,['u1','u2']);expect(a).toMatchObject({processCount:1,relationCount:3,totalHours:120,sourceObservations:1});expect(a.departmentIds).toEqual(['dep']);
  expect(processReach(d,2028,['u1']).processIds).toEqual(['p1','p2']);
  expect(processReach(d,2027,['u2']).processCount).toBe(1);
 });
 it('preserves other relations and deduplicates an exact repeated relation',()=>{
  const d=fixture(),draft={fromId:'u1',toId:'p2',type:'supports' as const,validFrom:'2027-01-01'};
  const added=addRelation(d,draft);expect(added.relations).toHaveLength(6);
  expect(addRelation(added,draft).relations).toHaveLength(6);
 });
});
