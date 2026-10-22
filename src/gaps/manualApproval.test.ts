import {describe,it,expect} from 'vitest';
import {emptySemantic} from '../domain/semantic';
import {gapKey} from './model';
import {manualApprovedRows,reviewManualApprovals} from './manualApproval';
import type {GapState} from './store';
const key=gapKey('r','lo',2027,'development');
function fixture(){
 const data=emptySemantic();data.entities.push({id:'uo',kind:'uo',name:'UO',aliases:[]},{id:'lo',kind:'lo',name:'LO IA',aliases:[],parentId:'uo'});
 const state:GapState={requirements:[{id:'r',name:'IT per LO',entityKind:'lo',measureId:'it_hours',years:[2027],activities:['development'],required:true}],resolutions:[{key,status:'manual',value:0,reason:'Registrerat',updatedAt:'1'}],manualApprovals:[{key,resolutionUpdatedAt:'1',approvedAt:'2'}]};
 return {data,state};
}
describe('manual approval',()=>{
 it('accepts explicit approved zero and preserves source data',()=>{
  const {data,state}=fixture(),before=JSON.stringify(data);
  expect(manualApprovedRows(data,state)).toMatchObject([{entityId:'lo',value:0,activity:'development'}]);
  expect(JSON.stringify(data)).toBe(before);
  expect(manualApprovedRows(data,state,{year:2028})).toEqual([]);
 });
 it('requires renewed approval after manual edit or revocation',()=>{
  const {data,state}=fixture();state.resolutions[0].updatedAt='3';
  expect(reviewManualApprovals(data,state)[0].status).toBe('stale');
  expect(manualApprovedRows(data,state)).toEqual([]);
  state.manualApprovals=[];expect(manualApprovedRows(data,state)).toEqual([]);
 });
 it('rejects an original observation for the same scope',()=>{
  const {data,state}=fixture();
  data.observations.push({id:'o',entityId:'lo',measureId:'it_hours',value:4,activity:'development',period:{year:2027},planningVersion:'2027',scenario:'need',kind:'subset',quality:'reported',source:{datasetId:'s',fileName:'a.xlsx',sheet:'S',cell:'D1'}});
  expect(reviewManualApprovals(data,state)[0].status).toBe('invalid');
  expect(manualApprovedRows(data,state)).toEqual([]);
 });
 it('prevents duplicates across separate requirements for same target',()=>{
  const {data,state}=fixture();const key2=gapKey('r2','lo',2027,'development');
  state.requirements.push({...state.requirements[0],id:'r2'});
  state.resolutions.push({key:key2,status:'manual',value:100,reason:'',updatedAt:'1'});
  state.manualApprovals!.push({key:key2,approvedAt:'2',resolutionUpdatedAt:'1'});
  expect(manualApprovedRows(data,state)).toEqual([]);
 });
});
