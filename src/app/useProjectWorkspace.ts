import {useEffect,useState,type Dispatch,type SetStateAction} from 'react';
import {recoverSourceMutation} from '../import/sourceManagement';
import {recoverInterruptedRestore} from '../portability/store';
import {loadCanonical} from '../domain/canonicalStore';
import {loadGapState} from '../gaps/store';
import {projectOverviewStatus,type OverviewStatus} from '../overview/projectOverviewStatus';
import {loadProject,saveProject} from '../storage';
import type {AnalysisProject,ViewId} from '../model';

/** Owns project initialization, overview refreshes and project edits.
 * Navigation stays in App; the existing load/error contracts stay unchanged.
 */
export function useProjectWorkspace(view:ViewId,setView:Dispatch<SetStateAction<ViewId>>){
 const [analysisRefresh,setAnalysisRefresh]=useState(0);
 const [project,setProject]=useState<AnalysisProject|null>(null);
 const [storageError,setStorageError]=useState('');
 const [overview,setOverview]=useState<OverviewStatus|null>(null);
 const [overviewError,setOverviewError]=useState('');

 useEffect(()=>{
  let active=true;
  recoverInterruptedRestore()
   .then(()=>recoverSourceMutation())
   .then(()=>loadProject())
   .then(p=>{if(active)setProject(p)})
   .catch(()=>{if(active)setStorageError('Lokal lagring eller återställning misslyckades. Kontrollera datalagringen innan du fortsätter.')});
  return ()=>{active=false};
 },[]);

 useEffect(()=>{
  let active=true;
  if(!project){setOverview(null);return ()=>{active=false}};
  void Promise.all([loadCanonical(),loadGapState()])
   .then(([canonical,gaps])=>{
    if(active){setOverview(projectOverviewStatus(project,canonical,gaps));setOverviewError('')}
   })
   .catch(()=>{
    if(active){setOverview(null);setOverviewError('Kunde inte läsa projektets analysstatus. Kontrollera lokal lagring.')}
   });
  return ()=>{active=false};
 },[project,analysisRefresh,view]);

 const analysisAvailable=overview?.hasData===true&&!overviewError&&!storageError;

 const openAnalysis=async()=>{
  try{
   // Read persisted source data at navigation, not an out-of-date UI snapshot.
   const [currentProject,canonical,gaps]=await Promise.all([loadProject(),loadCanonical(),loadGapState()]);
   const status=projectOverviewStatus(currentProject,canonical,gaps);
   setProject(currentProject);setOverview(status);setOverviewError('');
   if(status.hasData){setAnalysisRefresh(v=>v+1);setView('analysis')}
   else {setView('import');setOverviewError('Importera minst en källa med analysuppgifter innan du öppnar Analys.')}
  }catch{
   setView('import');setOverview(null);
   setOverviewError('Kunde inte kontrollera importerade analysuppgifter. Försök igen eller kontrollera lokal lagring.');
  }
 };

 const updateName=async(name:string)=>{
  if(!project)return;
  const next={...project,name};
  setProject(next);
  try{await saveProject(next);setStorageError('')}
  catch{setStorageError('Kunde inte spara projektet lokalt.')}
 };

 const projectImported=(next:AnalysisProject)=>{
  setProject(next);
  setAnalysisRefresh(v=>v+1);
 };
 const refreshAnalysis=()=>setAnalysisRefresh(v=>v+1);

 return {project,analysisRefresh,storageError,overview,overviewError,analysisAvailable,
  openAnalysis,updateName,projectImported,refreshAnalysis};
}
