import {openDB} from 'idb';
import {emptySemantic,migrateSemantic,type SemanticDataset} from './semantic';
const DB='utvecklingsanalys-semantic';
async function database(){return openDB(DB,1,{upgrade(db){db.createObjectStore('datasets');}});}
export async function loadSemantic():Promise<SemanticDataset>{
 const db=await database();const data=await db.get('datasets','active');
 return data===undefined?emptySemantic():migrateSemantic(data);
}
export async function saveSemantic(data:SemanticDataset):Promise<void>{
 migrateSemantic(data);
 const db=await database();await db.put('datasets',data,'active');
}
