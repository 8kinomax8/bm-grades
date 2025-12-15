import { useState, useEffect } from 'react';
import { listSemesterGrades, upsertSemesterGrade, deleteSemesterGrade } from '../services/semesterGradeService';

/**
 * Hook pour gérer les notes semestrielles depuis Supabase
 * @param {Object} user - Utilisateur authentifié
 * @returns {Object} {semesterGrades, loading, error, upsert, remove}
 */
export function useSupabaseSemesterGrades(user) {
  const [semesterGrades, setSemesterGrades] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load semester grades on mount
  useEffect(() => {
    if (!user) {
      setSemesterGrades({});
      setLoading(false);
      return;
    }

    const fetchSemesterGrades = async () => {
      try {
        setLoading(true);
        const data = await listSemesterGrades();
        
        // Convert Supabase format to local format
        // Local format: { "Subject": { 1: 5.5, 2: 5.0 } }
        const formatted = {};
        data.forEach(item => {
          const subjectName = item.subjects?.name;
          if (!subjectName) return;
          
          if (!formatted[subjectName]) {
            formatted[subjectName] = {};
          }
          
          formatted[subjectName][item.semester_number] = parseFloat(item.grade);
        });
        
        setSemesterGrades(formatted);
        setError(null);
      } catch (err) {
        console.error('Error loading semester_grades:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSemesterGrades();
  }, [user]);

  // Function to add/update a semester grade
  const upsert = async ({ subject_id, semester_number, grade }) => {
    try {
      await upsertSemesterGrade({ subject_id, semester_number, grade });
      
      // Reload data
      const data = await listSemesterGrades();
      const formatted = {};
      data.forEach(item => {
        const subjectName = item.subjects?.name;
        if (!subjectName) return;
        
        if (!formatted[subjectName]) {
          formatted[subjectName] = {};
        }
        
        formatted[subjectName][item.semester_number] = parseFloat(item.grade);
      });
      
      setSemesterGrades(formatted);
    } catch (err) {
      console.error('Error upserting semester_grade:', err);
      throw err;
    }
  };

  // Function to delete a semester grade
  const remove = async (id) => {
    try {
      await deleteSemesterGrade(id);
      
      // Reload data
      const data = await listSemesterGrades();
      const formatted = {};
      data.forEach(item => {
        const subjectName = item.subjects?.name;
        if (!subjectName) return;
        
        if (!formatted[subjectName]) {
          formatted[subjectName] = {};
        }
        
        formatted[subjectName][item.semester_number] = parseFloat(item.grade);
      });
      
      setSemesterGrades(formatted);
    } catch (err) {
      console.error('Error deleting semester_grade:', err);
      throw err;
    }
  };

  return {
    semesterGrades,
    loading,
    error,
    upsert,
    remove
  };
}
