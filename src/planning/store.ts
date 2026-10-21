import {openDB} from 'idb';
import {emptyPlanning,type PlanningState} from './model';
async function db(){return openDB('utvecklingsanalys-planning',1,{upgrade(d){d.createObjectStore('state')}})}
export async function loadPlanning():Promise<PlanningState>{return await (await db()).get('state','active')??emptyPlanning()}
export async function savePlanning(s:PlanningState){await (await db()).put('state',s,'active')}
