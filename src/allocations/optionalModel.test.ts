import {describe,it,expect} from 'vitest';
import {emptyOptionalAllocations,parseOptionalAllocations,readOptionalAllocations,optionalAllocationKey,type OptionalAllocations} from './optionalModel';
import {buildPackage,parsePackage,mergedPackage} from '../config/packages';
import {emptyAllocations} from './model';

const fixture=():OptionalAllocations=>({
 schemaVersion:2,
 dimensions:[{id:'effekt',name:'Effekt',categories:[{id:'direct',name:'Direkt effekt'},{id:'indirect',name:'Förutsättningsskapande'}],appliesTo:{metrics:['it_hours','business_hours'],activities:['development','maintenance']}}],
 rules:[{dimensionId:'effekt',year:2027,scope:{kind:'uo',uoId:'uo-a'},percentages:{direct:60,indirect:25}},
 {dimensionId:'effekt',year:2027,scope:{kind:'lo',uoId:'uo-a',loId:'lo-1'},percentages:{direct:80}}]
});
describe('DEV-130 optional allocation contract',()=>{
 it('preserves valid independent metric and activity scope',()=>{
  expect(parseOptionalAllocations(fixture())).toEqual(fixture());
  expect(readOptionalAllocations(undefined)).toEqual(emptyOptionalAllocations());
 });
 it('rejects mixed units, invalid activity and over-allocation',()=>{
  const mixed=fixture();mixed.dimensions[0].appliesTo.metrics=['it_hours','other_cost'];
  expect(()=>parseOptionalAllocations(mixed)).toThrow('MIXED_UNITS');
  const invalid=fixture();invalid.dimensions[0].appliesTo.activities=['development','development'];
  expect(()=>parseOptionalAllocations(invalid)).toThrow('INVALID_ACTIVITIES');
  const over=fixture();over.rules[0].percentages={direct:90,indirect:20};
  expect(()=>parseOptionalAllocations(over)).toThrow('OVERALLOCATED');
 });
 it('keeps identically named LO identifiers distinct by UO and rejects duplicate scopes',()=>{
  const data=fixture(),lo=data.rules[1];const other={...lo,scope:{kind:'lo' as const,uoId:'uo-b',loId:'lo-1'}};
  expect(optionalAllocationKey(lo)).not.toBe(optionalAllocationKey(other));
  data.rules.push(other);expect(parseOptionalAllocations(data).rules).toHaveLength(3);
  data.rules.push({...lo});expect(()=>parseOptionalAllocations(data)).toThrow('DUPLICATE_RULE');
 });
 it('roundtrips old v1 allocation and new v2 section without implicit migration',()=>{
  const legacy=emptyAllocations();
  const old=buildPackage(legacy,undefined,'full-configuration');
  expect(parsePackage(old).sections.optionalAllocations).toBeUndefined();
  const complete=buildPackage(legacy,undefined,'full-configuration',undefined,fixture());
  expect(parsePackage(JSON.parse(JSON.stringify(complete)))).toEqual(complete);
  expect(complete.sections.allocations).toEqual(legacy);
  const definitions=buildPackage(legacy,undefined,'definitions-only',undefined,fixture());
  expect(definitions.sections.optionalAllocations?.rules).toEqual([]);
  expect(()=>parsePackage({...definitions,sections:complete.sections})).toThrow('DEFINITIONS_PACKAGE_HAS_RULES');
  const merged=mergedPackage(old,complete,'replace');
  expect(merged.sections.optionalAllocations?.rules).toHaveLength(2);
  expect(merged.sections.allocations).toEqual(legacy);
  const restored=mergedPackage(merged,definitions,'replace');
  expect(restored.sections.optionalAllocations?.rules).toHaveLength(2);
 });
});
