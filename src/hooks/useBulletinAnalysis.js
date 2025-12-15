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

      // SAL processing
      if (scanType === 'SAL' && result.controls) {
        const { updatedSubjects, addedControls } = processSALScan(
          result,
          subjects,
          validSubjects
        );
        
        setSubjects(updatedSubjects);
        
        // Save to Supabase if callback provided
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
          message: `${addedControls.length} assessment(s) added`
        });
      }
      // Bulletin processing
      else if (result.grades) {
        const { updatedSemesterGrades, mappedGrades, semester } = processBulletinScan(
          result,
          semesterGrades,
          validSubjects,
          currentSemester
        );

        setSemesterGrades(updatedSemesterGrades);
        
        // Save to Supabase if callback provided
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
      console.error('Analysis error:', error);
      setAnalysisResult({
        error: 'Error analyzing the image. Check the format.'
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileUpload = (e, activeTab) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // "Current Semester" mode: SAL screenshots only
    if (activeTab === 'current') {
      if (!file.type.startsWith('image/')) {
        setAnalysisResult({
          error: 'Only screenshots (JPG, PNG) are accepted for the current semester.'
        });
        return;
      }
      analyzeFile(file, 'SAL');
      return;
    }

    // "Previous Bulletins" mode: image or PDF
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
