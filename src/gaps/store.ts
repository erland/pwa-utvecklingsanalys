import {openDB} from 'idb';
import type {InformationRequirement,GapResolution} from './model';
const DB='utvecklingsanalys-information-gaps';
export type GapState={requirements:InformationRequirement[];resolutions:GapResolution[]};
const empty=():GapState=>({requirements:[],resolutions:[]});
async function db(){return openDB(DB,1,{upgrade(d){d.createObjectStore('state')}})}
export async function loadGapState():Promise<GapState>{return await (await db()).get('state','active')??empty()}
export async function saveGapState(state:GapState):Promise<void>{await (await db()).put('state',state,'active')}
