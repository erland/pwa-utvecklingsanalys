import type {AnalysisRecord} from '../domain/canonical';
import type {PreparedDataset} from '../domain/preparedAnalysis';

export type AnalysisScopeFilters={datasetIds:readonly string[];uoIds:readonly string[];loIds:readonly string[]};
const sourceId=(r:AnalysisRecord)=>r.source?.datasetId??r.workloadId.split('|')[0]??'';

/** Apply optional source and work filters once, before both the navigator and the reports.
 * Empty selections mean all. Work filters must not silently restrict the department axis.
 * The dataset is already prepared: never regenerate approved activity allocations here.
 */
export function scopePreparedAnalysis(data:PreparedDataset,filters:AnalysisScopeFilters):PreparedDataset{
 const records=data.records.filter(r=>
  (!filters.datasetIds.length||filters.datasetIds.includes(sourceId(r)))&&
  (r.scope.axis!=='work'||(
   (!filters.uoIds.length||filters.uoIds.includes(r.scope.uoId))&&
   (!filters.loIds.length||Boolean(r.scope.loId&&filters.loIds.includes(r.scope.loId)))
  ))
 );
 return {...data,records};
}
