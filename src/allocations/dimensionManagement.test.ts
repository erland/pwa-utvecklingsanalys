import {describe,it,expect} from 'vitest';
import {deleteDimension,updateDimension} from './dimensionManagement';
import type {OptionalAllocations} from './optionalModel';
const original=():OptionalAllocations=>({schemaVersion:2,dimensions:[{id:'d',name:'Ursprunglig',categories:[{id:'a',name:'A'},{id:'b',name:'B'}],appliesTo:{metrics:['it_hours'],activities:['development']}}],rules:[{dimensionId:'d',year:0,scope:{kind:'uo',uoId:'uo:1'},percentages:{a:75,b:25}}]});
describe('DEV-149 fördelningstyper',()=>{
 it('redigerar namn och omfattning utan att förlora regler eller kategori-ID',()=>{
  const before=original();
  const next=updateDimension(before,'d',{name:'Ny',names:['Alfa','Beta','Gamma'],metrics:['it_hours','business_hours'],activities:['development','maintenance']},()=> 'c');
  expect(next.dimensions[0].categories).toEqual([{id:'a',name:'Alfa'},{id:'b',name:'Beta'},{id:'c',name:'Gamma'}]);
  expect(next.rules).toEqual(before.rules);
  expect(before.dimensions[0].name).toBe('Ursprunglig');
 });
 it('hindrar borttagning av kategori med sparade regler',()=>{
  expect(()=>updateDimension(original(),'d',{name:'Ny',names:['A','B'].slice(0,1),metrics:['it_hours'],activities:['development']},()=> 'x')).toThrow();
 });
 it('tar bort typ och tillhörande regler utan att ändra andra typer',()=>{
  const before=original();before.dimensions.push({id:'other',name:'Annat',categories:[{id:'x',name:'X'},{id:'y',name:'Y'}],appliesTo:{metrics:['it_hours'],activities:'all'}});
  const next=deleteDimension(before,'d');
  expect(next.dimensions.map(d=>d.id)).toEqual(['other']);
  expect(next.rules).toEqual([]);
  expect(before.rules).toHaveLength(1);
 });
 it('avvisar ogiltiga namn och blandade enheter',()=>{
  expect(()=>updateDimension(original(),'d',{name:'',names:['A','B'],metrics:['it_hours'],activities:'all'},()=> 'x')).toThrow();
  expect(()=>updateDimension(original(),'d',{name:'Ny',names:['A','A'],metrics:['it_hours'],activities:'all'},()=> 'x')).toThrow();
  expect(()=>updateDimension(original(),'d',{name:'Ny',names:['A','B'],metrics:['it_hours','other_cost'],activities:'all'},()=> 'x')).toThrow();
 });
});