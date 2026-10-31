import type {CanonicalDataset} from '../domain/canonical';
import type {GapState} from '../gaps/store';
import {analyzeCanonical} from '../analytics/canonicalQuery';
import type {OptionalAllocations,OptionalAllocationDimension,OptionalAllocationRule} from './optionalModel';
import {optionalAllocationKey} from './optionalModel';
import {percentagesFor,shiftBinaryUo,partKey,type WeightedPart} from './weightedSync';

export type AllocationEditScope={uoId:string;loId?:string;overhead?:boolean;year:number};

/** Materialize effective annual values first, then rewrite only the selected UO/LO and years. */
export function applyProportionalScope(data:CanonicalDataset,gaps:GapState,config:OptionalAllocations,dimension:OptionalAllocationDimension,scope:AllocationEditScope,target:number):OptionalAllocations{
 if(dimension.categories.length!==2)throw new Error('BINARY_DIMENSION_REQUIRED');
 if(!Number.isFinite(target)||target<0||target>100)throw new Error('INVALID_TARGET');
 const [first,second]=dimension.categories.map(c=>c.id);
 const years=[...new Set(data.records.filter(r=>r.scope.axis==='work'&&r.scope.uoId===scope.uoId&&(scope.year===0||r.year===scope.year)).map(r=>r.year))].sort();
 const changes:{year:number;part:WeightedPart}[]=[];
 for(const y of years){
  const result=analyzeCanonical(data,gaps,{axis:'work',metrics:dimension.appliesTo.metrics,activity:dimension.appliesTo.activities==='all'||dimension.appliesTo.activities.length===2?'all':dimension.appliesTo.activities[0],year:y,detailUoId:scope.uoId});
  for(const row of result.rows){
   if(row.value<=0)continue;
   const overhead=row.key===scope.uoId||row.key==='uo-overhead:'+scope.uoId;
   if(scope.loId!==undefined&&(overhead||row.key!==scope.loId))continue;
   if(scope.overhead&&!overhead)continue;
   if(!scope.overhead&&scope.loId===undefined||scope.overhead||scope.loId===row.key){
    const partScope:WeightedPart['scope']=overhead?{kind:'uo-overhead',uoId:scope.uoId}:{kind:'lo',uoId:scope.uoId,loId:row.key};
    changes.push({year:y,part:{scope:partScope,hours:row.value}});
   }
  }
 }
 if(changes.length===0)return config;
 const parts:WeightedPart[]=changes.map(c=>c.part);
 const values=new Map(changes.map((c,i)=>[String(i),percentagesFor(config,dimension.id,c.year,c.part.scope,[first,second])]));
 // Give each year/LO combination a unique key; shiftBinaryUo only reads partKey.
 const synthetic=parts.map((p,i)=>({...p,scope:{kind:'lo' as const,uoId:scope.uoId,loId:String(i)}}));
 const syntheticValues=new Map(synthetic.map((p,i)=>[partKey(p.scope),values.get(String(i))!]));
 const shifted=shiftBinaryUo(synthetic,syntheticValues,first,second,target);
 const rules:OptionalAllocationRule[]=changes.map((change,i)=>({dimensionId:dimension.id,year:change.year,scope:change.part.scope,percentages:shifted.get(partKey(synthetic[i].scope))!}));
 const keys=new Set(rules.map(optionalAllocationKey));
 // A UO edit materializes each affected LO/year. Remove UO rules for these years
 // so an older UO annual override cannot unexpectedly mask a subsequent LO edit.
 const yearSet=new Set(years);
 return {...config,rules:[...config.rules.filter(r=>!keys.has(optionalAllocationKey(r))&&!(scope.loId===undefined&&!scope.overhead&&r.dimensionId===dimension.id&&r.scope.kind==='uo'&&r.scope.uoId===scope.uoId&&yearSet.has(r.year))),...rules]};
}
