import { useEffect } from 'react';
import { storage } from '../utils/storage';

const STORAGE_KEY = 'bm-calculator-data';

/**
 * Hook personnalisé pour charger les données au démarrage
 */
export const useLoadData = (setters) => {
  useEffect(() => {
    try {
      const data = storage.get(STORAGE_KEY);
      // Charger le semestre sauvegardé séparément en priorité
      const savedSemester = storage.get('currentSemester');
      
      if (data) {
        setters.setSubjects(data.subjects || {});
        setters.setSemesterGrades(data.semesterGrades || {});
        setters.setBmType(data.bmType || 'TAL');
        // Utiliser le semestre sauvegardé séparément ou celui dans data
        setters.setCurrentSemester(savedSemester || data.currentSemester || 1);
        setters.setSemesterPlans(data.semesterPlans || {});
        setters.setSubjectGoals(data.subjectGoals || {});
        if (setters.setMaturnoteGoal) setters.setMaturnoteGoal(data.maturnoteGoal || 5.0);
      } else if (savedSemester) {
        // Si pas de data mais semestre sauvegardé, le charger quand même
        setters.setCurrentSemester(savedSemester);
      }
    } catch (error) {
      console.log('Aucune donnée sauvegardée trouvée');
    }
  }, []);
};

/**
 * Hook personnalisé pour sauvegarder automatiquement les données
 */
export const useSaveData = (data) => {
  useEffect(() => {
    try {
      storage.set(STORAGE_KEY, data);
      // Sauvegarder aussi le semestre actuel séparément pour persistance
      storage.set('currentSemester', data.currentSemester);
    } catch (error) {
      console.error('Erreur de sauvegarde:', error);
    }
  }, [data.subjects, data.semesterGrades, data.bmType, data.currentSemester, data.semesterPlans, data.subjectGoals, data.maturnoteGoal]);
};
