import {describe,it,expect} from 'vitest';
import {emptySemantic,type Observation} from '../domain/semantic';
import {calculateDistribution,type DistributionRule} from './distribution';
import {approvalFromPreview,approvedRows,distributionSignature,evaluateApprovals} from './approved';
import type {InformationRequirement} from './model';
import type {GapState} from './store';
const req:InformationRequirement={id:'r',name:'Aktivitet per LO',measureId:'it_hours',entityKind:'lo',years:[2027],activities:['development'],required:true};
const rule:DistributionRule={id:'rule',requirementId:'r',year:2027,activity:'development',weightMeasureId:'it_hours',reason:'Utveckling utifrån detaljtimmar'};
const data=()=>{
 const d=emptySemantic();d.entities.push({id:'uo',name:'UO',kind:'uo',aliases:[]},{id:'a',name:'LO AUL',kind:'lo',aliases:[],parentId:'uo'},{id:'b',name:'LO IA',kind:'lo',aliases:[],parentId:'uo'});
 const obs=(id:string,entityId:string,value:number,kind:Observation['kind'],activity?:string):Observation=>({id,entityId,measureId:'it_hours',value,period:{year:2027},planningVersion:'2027',scenario:'need',source:{datasetId:'d',fileName:'a.xlsx',sheet:'S',cell:id},kind,quality:'reported',activity});
 d.observations.push(obs('D5','uo',100,'subset','development'),obs('D26','a',20,'detail'),obs('D32','b',30,'detail'));return d;
};
describe('approved completions are separate and freshness checked',()=>{
 const make=()=>{const d=data(),p=calculateDistribution(d,req,rule,[]),approval=approvalFromPreview(p,distributionSignature(rule,req));const state:GapState={requirements:[req],resolutions:[],rules:[rule],approvals:[approval]};return {d,p,state}};
 it('uses only explicitly approved values, preserves original observations',()=>{
  const {d,state}=make(),before=JSON.stringify(d);
  expect(evaluateApprovals(d,state)[0].status).toBe('current');
  expect(approvedRows(d,state,{measureId:'it_hours'}).map(x=>x.value)).toEqual([40,60]);
  expect(approvedRows(d,{...state,approvals:[]},{measureId:'it_hours'})).toEqual([]);
  expect(JSON.stringify(d)).toBe(before);
 });
 it('excludes stale approval when weights or source change, including restored state',()=>{
  const {d,state}=make();d.observations[1].value=50;
  expect(evaluateApprovals(d,state)[0].status).toBe('stale');
  expect(approvedRows(d,state)).toEqual([]);
 });
 it('invalidates approvals when rules change or source creates conflict',()=>{
  const {d,state}=make();
  state.rules=[{...rule,weightMeasureId:'business_hours'}];
  expect(evaluateApprovals(d,state)[0].status).not.toBe('current');
  state.rules=[rule];d.observations.push({...d.observations[1],id:'another',activity:'development'});
  expect(evaluateApprovals(d,state)[0].status).toBe('invalid');
  expect(approvedRows(d,state)).toEqual([]);
 });
 it('year and measure filters do not expand approved scope',()=>{
  const {d,state}=make();
  expect(approvedRows(d,state,{year:2028})).toEqual([]);
  expect(approvedRows(d,state,{measureId:'business_hours'})).toEqual([]);
 });
});
