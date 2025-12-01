import { useState } from 'react';
import { analyzeBulletin, processSALScan, processBulletinScan } from '../services/apiService';

/**
 * Hook personnalisé pour l'analyse des bulletins et screenshots SAL
 * @param {Object} subjects - Matières actuelles
 * @param {Function} setSubjects - Setter pour les matières
 * @param {Object} semesterGrades - Notes semestrielles
 * @param {Function} setSemesterGrades - Setter pour les notes semestrielles
 * @param {Set} validSubjects - Set des matières valides
 * @param {number} currentSemester - Semestre actuel
 * @param {Function} onAddControl - Callback pour ajouter un contrôle à Supabase
 * @param {Function} onSaveBulletin - Callback pour sauvegarder une note de bulletin à Supabase
 * @returns {Object} {isAnalyzing, analysisResult, analyzeFil, handleFileUpload}
 */
export const useBulletinAnalysis = (
  subjects,
  setSubjects,
  semesterGrades,
  setSemesterGrades,
  validSubjects,
  currentSemester,
  onAddControl = null,
  onSaveBulletin = null
) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  const analyzeFile = async (file, scanType = 'Bulletin') => {
    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const result = await analyzeBulletin(file, scanType);

      if (result.error) {
        setAnalysisResult({ error: result.error });
        return;
      }

      // Traitement SAL
      if (scanType === 'SAL' && result.controls) {
        const { updatedSubjects, addedControls } = processSALScan(
          result,
          subjects,
          validSubjects
        );
        
        setSubjects(updatedSubjects);
        
        // Enregistrer dans Supabase si callback fourni
        if (onAddControl && addedControls.length > 0) {
          for (const control of addedControls) {
            await onAddControl(
              control.subject,
              control.grade,
              1,
              control.date,
              control.name
            );
          }
        }
        
        setAnalysisResult({
          semester: 'current',
          controls: addedControls,
          message: `${addedControls.length} contrôle(s) ajouté(s)`
        });
      }
      // Traitement Bulletin
      else if (result.grades) {
        const { updatedSemesterGrades, mappedGrades, semester } = processBulletinScan(
          result,
          semesterGrades,
          validSubjects,
          currentSemester
        );

        setSemesterGrades(updatedSemesterGrades);
        
        // Enregistrer dans Supabase si callback fourni
        if (onSaveBulletin && Object.keys(mappedGrades).length > 0) {
          for (const [subject, grade] of Object.entries(mappedGrades)) {
            await onSaveBulletin(subject, semester, grade);
          }
        }
        
        setAnalysisResult({
          semester,
          grades: mappedGrades
        });
      }
    } catch (error) {
      console.error('Erreur analyse:', error);
      setAnalysisResult({
        error: 'Erreur lors de l\'analyse de l\'image. Vérifiez le format.'
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileUpload = (e, activeTab) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Mode "Semestre Actuel" : uniquement screenshots SAL
    if (activeTab === 'current') {
      if (!file.type.startsWith('image/')) {
        setAnalysisResult({
          error: 'Seuls les screenshots (JPG, PNG) sont acceptés pour le semestre actuel.'
        });
        return;
      }
      analyzeFile(file, 'SAL');
      return;
    }

    // Mode "Bulletins Précédents" : image ou PDF
    if (activeTab === 'previous') {
      if (file.type.startsWith('image/') || file.type === 'application/pdf') {
        analyzeFile(file, 'Bulletin');
      }
    }
  };

  const resetAnalysis = () => {
    setAnalysisResult(null);
  };

  return {
    isAnalyzing,
    analysisResult,
    analyzeFile,
    handleFileUpload,
    resetAnalysis
  };
};
