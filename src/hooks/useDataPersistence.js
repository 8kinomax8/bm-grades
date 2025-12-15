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
      // Load the separately saved semester with priority
      const savedSemester = storage.get('currentSemester');
      
      if (data) {
        setters.setSubjects(data.subjects || {});
        setters.setSemesterGrades(data.semesterGrades || {});
        setters.setBmType(data.bmType || 'TAL');
        // Use the separately saved semester or the one in data
        setters.setCurrentSemester(savedSemester || data.currentSemester || 1);
        setters.setSemesterPlans(data.semesterPlans || {});
        setters.setSubjectGoals(data.subjectGoals || {});
        if (setters.setMaturnoteGoal) setters.setMaturnoteGoal(data.maturnoteGoal || 5.0);
      } else if (savedSemester) {
        // If no data but semester saved, load it anyway
        setters.setCurrentSemester(savedSemester);
      }
    } catch (error) {
      console.log('No saved data found');
    }
  }, []);
};

/**
 * Custom hook to automatically save data
 */
export const useSaveData = (data) => {
  useEffect(() => {
    try {
      storage.set(STORAGE_KEY, data);
      // Also save current semester separately for persistence
      storage.set('currentSemester', data.currentSemester);
    } catch (error) {
      console.error('Save error:', error);
    }
  }, [data.subjects, data.semesterGrades, data.bmType, data.currentSemester, data.semesterPlans, data.subjectGoals, data.maturnoteGoal]);
};
