import {openDB} from 'idb';
import {emptyAllocations,validateAllocation,type Allocations} from './model';
import {readConfiguration,commitConfiguration,revisions} from '../config/store';
async function db(){return openDB('utvecklingsanalys-allocations',1,{upgrade(d){d.createObjectStore('state')}})}
export async function loadAllocations():Promise<Allocations>{
 const config=await readConfiguration();if(config?.sections.allocations)return config.sections.allocations;
 const d=await db();return (await d.get('state','active') as Allocations|undefined)??emptyAllocations();
}
export async function saveAllocations(state:Allocations):Promise<void>{
 const issues=validateAllocation(state);if(issues.length)throw new Error(issues.join(', '));
 const config=await readConfiguration();
 if(config){const history=await revisions();await commitConfiguration({...config,sections:{...config.sections,allocations:state}},'Update allocation rules',history.at(-1)?.id);return;}
 const d=await db();await d.put('state',state,'active');
}
