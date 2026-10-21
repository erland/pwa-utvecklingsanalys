import {openDB} from 'idb';
import {emptyAllocations,validateAllocation,type Allocations} from './model';
async function db(){return openDB('utvecklingsanalys-allocations',1,{upgrade(d){d.createObjectStore('state')}})}
export async function loadAllocations():Promise<Allocations>{const d=await db();const state=await d.get('state','active') as Allocations|undefined;return state??emptyAllocations()}
export async function saveAllocations(state:Allocations):Promise<void>{const issues=validateAllocation(state);if(issues.length)throw new Error(issues.join(', '));const d=await db();await d.put('state',state,'active')}
