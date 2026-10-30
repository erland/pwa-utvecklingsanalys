import {analyzeCanonical,type CanonicalAnalysisQuery} from '../analytics/canonicalQuery';
import type {CanonicalDataset,Metric} from '../domain/canonical';
import type {GapState} from '../gaps/store';
import {parseOptionalAllocations,type OptionalAllocations,type OptionalAllocationDimension,type OptionalAllocationRule,type OptionalAllocationScope} from './optionalModel';

export type OptionalAllocationQuery={year?:number;uoIds?:string[];loIds?:string[];partId?:string;datasetIds?:string[];metrics?:Metric[];activity?:CanonicalAnalysisQuery['activity']};
export type OptionalAllocationResult={
 dimensionId:string;unit:'h'|'SEK';total:number;
 amounts:Record<string,number>;unallocated:number;allocated:number;
 visible:boolean;unknownCount:number;staleApprovals:number;excludedAlternatives:number;
 coverage:string;
};
const ruleFor=(data:OptionalAllocations,dimensionId:string,year:number,scope:OptionalAllocationScope):OptionalAllocationRule|undefined=>
 data.rules.find(r=>r.dimensionId===dimensionId&&r.year===year&&r.scope.kind===scope.kind&&r.scope.uoId===scope.uoId&&(scope.kind!=='lo'||r.scope.kind==='lo'&&r.scope.loId===scope.loId));

export function effectiveOptionalRule(data:OptionalAllocations,dimensionId:string,year:number,scope:OptionalAllocationScope){
 const direct=ruleFor(data,dimensionId,year,scope);
 const inherited=scope.kind==='uo'?undefined:ruleFor(data,dimensionId,year,{kind:'uo',uoId:scope.uoId});
 return {rule:direct??inherited,origin:direct?'own' as const:inherited?'inherited' as const:'none' as const};
}

/** Uses the canonical query's approved and deduplicated LO/overhead detail rows as disjoint volumes. */
export function analyzeOptionalAllocation(dataset:CanonicalDataset,gaps:GapState,config:OptionalAllocations,dimensionId:string,filter:OptionalAllocationQuery={}):OptionalAllocationResult{
 parseOptionalAllocations(config);
 const dimension:OptionalAllocationDimension|undefined=config.dimensions.find(d=>d.id===dimensionId);
 if(!dimension)throw new Error('UNKNOWN_DIMENSION');
 const {metrics:definedMetrics,activities}=dimension.appliesTo;
 const metrics=definedMetrics.filter(metric=>!filter.metrics||filter.metrics.includes(metric));
 const definedActivity:CanonicalAnalysisQuery['activity']=activities==='all'||activities.length===2?'all':activities[0];
 const selectedActivity=filter.activity??'all';
 const activity:CanonicalAnalysisQuery['activity']=definedActivity==='all'?selectedActivity:selectedActivity==='all'||selectedActivity===definedActivity?definedActivity:'allocated';
 const compatible=metrics.length>0&&(definedActivity==='all'||selectedActivity==='all'||selectedActivity===definedActivity);
 if(filter.partId&&filter.loIds?.length)throw new Error('CONFLICTING_PART_FILTERS');
 const years=[...new Set(dataset.records.filter(r=>r.scope.axis==='work'&&metrics.includes(r.metric)&&(!filter.year||r.year===filter.year)).map(r=>r.year))].sort();
 const uos=[...new Set(dataset.records.filter(r=>r.scope.axis==='work'&&metrics.includes(r.metric)&&(!filter.uoIds?.length||filter.uoIds.includes(r.scope.uoId))).map(r=>(r.scope.axis==='work'?r.scope.uoId:'')))].sort();
 const amounts=Object.fromEntries(dimension.categories.map(c=>[c.id,0])) as Record<string,number>;
 let total=0,unallocated=0,unknownCount=0,staleApprovals=0,excludedAlternatives=0,visible=false;
 for(const year of (compatible?years:[]))for(const uoId of uos){
  const detail=analyzeCanonical(dataset,gaps,{axis:'work',metrics,activity,year,detailUoId:uoId,datasetIds:filter.datasetIds,loIds:filter.partId&&!filter.partId.startsWith('uo-overhead:')?[filter.partId]:filter.loIds});
  unknownCount+=detail.unknownCount;
  // Approval/matrix metadata is global for a prepared projection, not additive per UO/year.
  staleApprovals=Math.max(staleApprovals,detail.staleApprovals);
  excludedAlternatives=Math.max(excludedAlternatives,detail.excludedAlternatives);
  const hasLo=detail.rows.some(r=>r.key!=='uo-overhead:'+uoId&&r.key!==uoId);
  if(hasLo&&detail.rows.some(r=>r.key===uoId))throw new Error('AMBIGUOUS_UO_TOTAL_WITH_LO');
  for(const row of detail.rows){
   if(filter.partId&&row.key!==filter.partId)continue;
   const scope:OptionalAllocationScope=row.key==='uo-overhead:'+uoId||row.key===uoId?{kind:'uo-overhead',uoId}:{kind:'lo',uoId,loId:row.key};
   const {rule}=effectiveOptionalRule(config,dimensionId,year,scope);
   total+=row.value;
   let allocated=0;
   for(const category of dimension.categories){
    const value=row.value*(rule?.percentages[category.id]??0)/100;
    amounts[category.id]+=value;allocated+=value;
   }
   unallocated+=row.value-allocated;
   if(row.value>0&&rule&&Object.values(rule.percentages).some(p=>p>0))visible=true;
  }
 }
 const allocated=Object.values(amounts).reduce((sum,v)=>sum+v,0);
 if(Math.abs(total-allocated-unallocated)>1e-6*Math.max(1,total))throw new Error('ALLOCATION_BALANCE');
 return {dimensionId,unit:definedMetrics[0].endsWith('_hours')?'h':'SEK',total,amounts,allocated,unallocated,visible,unknownCount,staleApprovals,excludedAlternatives,coverage:unknownCount?'Vissa aktivitetsvärden saknar godkänd fördelning och ingår inte i beräknad total.':'Alla valda underlag har tillräcklig aktivitetstäckning.'};
}
