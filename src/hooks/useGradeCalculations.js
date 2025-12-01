import {
  calculateWeightedAverage,
  calculateSemesterAverage,
  calculateErfahrungsnote,
  calculateRequiredGrade,
  simulateAverage,
  parseWeight,
  calculatePromotionStatus
} from '../services/calculationService';

/**
 * Hook personnalisé pour tous les calculs de notes
 * @param {Object} subjects - Matières avec leurs notes
 * @param {Object} semesterGrades - Notes semestrielles
 * @param {Object} semesterSimulator - Simulateur de semestre
 * @param {Object} examSimulator - Simulateur d'examen
 * @param {string} bmType - Type de BM
 * @returns {Object} Fonctions de calcul
 */
export const useGradeCalculations = (subjects, semesterGrades, semesterSimulator, examSimulator, bmType) => {
  
  // Calculs pour le semestre actuel
  const getSemesterAverage = (subject) => {
    return calculateSemesterAverage(subjects[subject]);
  };

  const getErfahrungsnote = (subject) => {
    return calculateErfahrungsnote(semesterGrades[subject]);
  };

  const getRequiredSemesterGrade = (subject, targetAverage, nextWeight = 1) => {
    const currentGrades = subjects[subject] || [];
    return calculateRequiredGrade(currentGrades, targetAverage, nextWeight);
  };

  // Calculs pour le simulateur de semestre
  const getSimulatedSemesterAverage = (subject) => {
    const currentGrades = subjects[subject] || [];
    const plannedControls = semesterSimulator[subject] || [];
    return simulateAverage(currentGrades, plannedControls);
  };

  // Calculs pour les examens finaux
  const getExamAverage = (subject) => {
    const erfahrungsnote = getErfahrungsnote(subject);
    const examGrade = examSimulator[subject];
    if (!erfahrungsnote || !examGrade) return null;
    return (erfahrungsnote + examGrade) / 2;
  };

  const getRequiredExamGrade = (subject, targetAverage) => {
    const erfahrungsnote = getErfahrungsnote(subject);
    if (!erfahrungsnote) return null;
    return 2 * targetAverage - erfahrungsnote;
  };

  // Calcul de la moyenne générale (Gesamtnote)
  const getOverallAverage = () => {
    const subjects = Object.keys(semesterGrades);
    if (subjects.length === 0) return null;
    
    let totalWeightedSum = 0;
    let totalWeight = 0;
    
    subjects.forEach(subject => {
      const examGrade = examSimulator[subject];
      if (examGrade) {
        const avg = getExamAverage(subject);
        if (avg) {
          totalWeightedSum += avg;
          totalWeight += 1;
        }
      }
    });
    
    return totalWeight > 0 ? totalWeightedSum / totalWeight : null;
  };

  // Statut de promotion semestrielle
  const getPromotionStatus = (simulatedGrades = null) => {
    const gradesToUse = simulatedGrades || Object.entries(semesterGrades).reduce((acc, [subject, grades]) => {
      const latestSemester = Math.max(...Object.keys(grades).map(Number));
      acc[subject] = grades[latestSemester];
      return acc;
    }, {});

    return calculatePromotionStatus(gradesToUse, bmType);
  };

  // Statut de promotion simulé
  const getSimulatedPromotionStatus = () => {
    const simulatedGrades = {};
    
    Object.keys(subjects).forEach(subject => {
      const simAvg = getSimulatedSemesterAverage(subject);
      if (simAvg) {
        simulatedGrades[subject] = Math.round(simAvg * 2) / 2; // Arrondir au demi-point
      }
    });

    return calculatePromotionStatus(simulatedGrades, bmType);
  };

  return {
    // Semestre actuel
    getSemesterAverage,
    getErfahrungsnote,
    getRequiredSemesterGrade,
    
    // Simulateur
    getSimulatedSemesterAverage,
    
    // Examens
    getExamAverage,
    getRequiredExamGrade,
    getOverallAverage,
    
    // Promotion
    getPromotionStatus,
    getSimulatedPromotionStatus,
    
    // Utilitaires
    parseWeight
  };
};
