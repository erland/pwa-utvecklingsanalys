import {describe,it,expect} from 'vitest';
import {buildPackage,parsePackage,conflicts,mergedPackage,proposeYear} from './packages';
import type {Allocations} from '../allocations/model';
import type {OptionalAllocations} from '../allocations/optionalModel';
const alloc=(name='Arbetstyp'):Allocations=>({schemaVersion:1,dimensions:[{id:'d1',name,basis:'manual',categories:[{id:'a',name:'A'}]}],rules:[{dimensionId:'d1',entityId:'u1',year:2027,percentages:{a:60},origin:'uo-proposal'}]});
const mapping={sheet:'Budget',uoCell:'B1',headerRow:11,areaColumn:2,labelColumn:3,startRow:19};
describe('configuration package',()=>{
 it('roundtrips full and definitions-only with proper omissions',()=>{
  const full=buildPackage(alloc(),{'Profil A':mapping},'full-configuration');
  expect(parsePackage(JSON.parse(JSON.stringify(full)))).toEqual(full);
  const defs=buildPackage(alloc(),{'Profil A':mapping},'definitions-only');
  expect(defs.sections.allocations?.rules).toEqual([]);
  expect(()=>parsePackage({...defs,sections:full.sections})).toThrow('DEFINITIONS_PACKAGE_HAS_RULES');
 });
 it('copies allocation rules to another year without overwriting target rules',()=>{const a=alloc();const b=proposeYear(a,2027,2028);expect(b.rules).toHaveLength(2);expect(b.rules.find(x=>x.year===2028)?.percentages.a).toBe(60);const c=proposeYear(b,2027,2028);expect(c.rules).toHaveLength(2);expect(()=>proposeYear(a,2027,2027)).toThrow('INVALID_YEAR');});
 it('rejects unknown versions and corrupt category totals',()=>{
  expect(()=>parsePackage({...buildPackage(alloc(),undefined,'full-configuration'),version:2})).toThrow('UNSUPPORTED_PACKAGE_VERSION');
  const broken=alloc();broken.rules[0].percentages.a=120;
  expect(()=>buildPackage(broken,undefined,'full-configuration')).toThrow('INVALID_ALLOCATIONS');
 });
 it('rejects silent overwrite, permits explicit replace and retains local rules in definitions mode',()=>{
  const current=buildPackage(alloc(),{'Main':mapping},'full-configuration');
  const incoming=buildPackage(alloc('Changed'),{'Main':{...mapping,sheet:'New'}},'definitions-only');
  expect(conflicts(current,incoming)).toHaveLength(2);
  expect(()=>mergedPackage(current,incoming,'reject')).toThrow('CONFLICTS_REQUIRE_RESOLUTION');
  const replacement=mergedPackage(current,incoming,'replace');
  expect(replacement.sections.allocations?.dimensions[0].name).toBe('Changed');
  expect(replacement.sections.allocations?.rules).toHaveLength(1);
  expect(replacement.sections.mappings?.Main.sheet).toBe('New');
 });
 it('detects optional allocation conflicts by name and preserves rules in a definitions-only merge',()=>{
  const dimensions:OptionalAllocations['dimensions']=[{id:'effekt',name:'Effekt',categories:[{id:'direct',name:'Direkt'},{id:'indirect',name:'Förutsättningar'}],appliesTo:{metrics:['it_hours'],activities:'all'}}];
  const original:OptionalAllocations={schemaVersion:2,dimensions,rules:[{dimensionId:'effekt',year:2027,scope:{kind:'lo',uoId:'uo1',loId:'lo1'},percentages:{direct:75}}]};
  const current=buildPackage(alloc(),undefined,'full-configuration',undefined,original);
  const duplicate:OptionalAllocations={schemaVersion:2,dimensions:[{...dimensions[0],id:'other-id',categories:[...dimensions[0].categories]}],rules:[]};
  const incoming=buildPackage(undefined,undefined,'definitions-only',undefined,duplicate);
  expect(conflicts(current,incoming).some(c=>c.section==='optionalAllocations')).toBe(true);
  expect(()=>mergedPackage(current,incoming,'reject')).toThrow('CONFLICTS_REQUIRE_RESOLUTION');
  const renamed=mergedPackage(current,incoming,'replace');
  expect(renamed.sections.optionalAllocations?.dimensions).toHaveLength(1);
  // A definition-only import cannot silently orphan existing rules after changing a dimension ID.
  expect(()=>parsePackage(renamed)).toThrow('UNKNOWN_DIMENSION');
  const sameId=buildPackage(undefined,undefined,'definitions-only',undefined,original);
  const safe=mergedPackage(current,sameId,'replace');
  expect(safe.sections.optionalAllocations?.rules).toEqual(original.rules);
  expect(parsePackage(JSON.parse(JSON.stringify(safe)))).toEqual(safe);
 });

});
