import { useState } from 'react';
import { analyzeBulletin, processSALScan, processBulletinScan } from '../services/apiService';
import { formatSwissDate } from '../utils';

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

  const normalizeNumber = (value) => {
    if (value === null || value === undefined || value === '') return null;
    const cleaned = String(value).replace(',', '.');
    const parsed = parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const analyzeFile = async (file, scanType = 'Bulletin') => {
    setIsAnalyzing(true);
    setAnalysisResult(null);

    // Guard against oversized files that trigger 413 + missing CORS headers
    const MAX_UPLOAD_BYTES = 12 * 1024 * 1024; // 12 MB
    if (file.size > MAX_UPLOAD_BYTES) {
      setAnalysisResult({
        error: 'Fichier trop volumineux (>12 MB). Merci de compresser ou de fournir un extrait plus petit.'
      });
      setIsAnalyzing(false);
      return;
    }

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
            const normalizedGrade = normalizeNumber(control.grade);
            const normalizedWeight = Math.max(1, Math.round(normalizeNumber(control.weight) || 1));
            const normalizedDate = control.date ? formatSwissDate(control.date) : null;

            await onAddControl(
              control.subject,
              normalizedGrade,
              normalizedWeight,
              normalizedDate,
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
      else if (result.grades || result.semesters) {
        const { updatedSemesterGrades, semestersList } = processBulletinScan(
          result,
          semesterGrades,
          validSubjects,
          currentSemester
        );

        setSemesterGrades(updatedSemesterGrades);
        
        // Save to Supabase if callback provided
        if (onSaveBulletin && semestersList.length > 0) {
          for (const { semester, mappedGrades } of semestersList) {
            for (const [subject, grade] of Object.entries(mappedGrades)) {
              await onSaveBulletin(subject, semester, grade);
            }
          }
        }
        
        setAnalysisResult({
          semesters: semestersList,
          message: `${semestersList.length} semester(s) added with ${semestersList.reduce((acc, s) => acc + Object.keys(s.mappedGrades).length, 0)} grades`
        });
      }
    } catch (error) {
      console.error('Analysis error:', error);
      setAnalysisResult({
        error: 'Error analyzing the image. Check the format or try a smaller file.'
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
