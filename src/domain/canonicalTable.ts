import type {TableResult} from '../import/tabular';
import type {Resolution} from '../import/tabularAdapter';
import {validateCanonical,type AnalysisRecord,type Metric} from './canonical';

/** Only department hours are representable in v2. Staff counts and non-department
 * facts remain in the legacy semantic catalog until the contract supports them. */
export function canonicalFromTable(result:TableResult,datasetId:string,resolutions:Resolution={}):AnalysisRecord[]{
 if(result.issues.some(i=>i.severity==='error'))throw new Error('INVALID_TABLE_IMPORT');
 const records:AnalysisRecord[]=[];
 for(const fact of result.facts){
  if(fact.entityKind!=='department'||!['it_hours','business_hours'].includes(fact.measureId))continue;
  if(fact.value<0)throw new Error('NEGATIVE_DEPARTMENT_HOURS');
  const key=fact.entityKind+':'+fact.entityName;
  const deptId=resolutions[key]??'department:'+encodeURIComponent(fact.entityName.trim().normalize('NFKC'));
  const identity=[datasetId,fact.source.sheet,fact.source.cell,fact.measureId].map(encodeURIComponent).join('|');
  records.push({id:identity,metric:fact.measureId as Metric,value:fact.value,year:fact.year,activity:'unknown',scope:{axis:'department',departmentId:deptId},authority:'original',approval:'reported',
   workloadId:[datasetId,deptId,fact.measureId,fact.year].join('|'),granularity:'total',source:{datasetId,...fact.source}});
 }
 const issues=validateCanonical({schemaVersion:2,records});
 if(issues.length)throw new Error(issues.join(','));
 return records;
}
