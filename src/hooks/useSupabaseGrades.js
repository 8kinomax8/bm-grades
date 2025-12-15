import { useEffect, useState, useCallback } from 'react';
import { listGrades, addGrade, updateGrade, deleteGrade } from '../services/gradeService';

// This hook manages grade synchronization with Supabase
export function useSupabaseGrades(user) {
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load grades on login
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    
    // Load grades with joined subject information
    const loadGradesWithSubjects = async () => {
      try {
        const { supabase } = await import('../services/supabaseClient');
        const { data, error } = await supabase
          .from('grades')
          .select(`
            id,
            semester_number,
            grade,
            weight,
            date,
            control_name,
            source,
            created_at,
            subjects (
              id,
              name,
              code
            )
          `)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        // Format data to include subject name
        const formattedGrades = data.map(g => ({
          ...g,
          subject_name: g.subjects?.name,
          subject_id: g.subjects?.id
        }));
        
        setGrades(formattedGrades);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    
    loadGradesWithSubjects();
  }, [user]);

  // Add
  const add = useCallback(async (gradeObj) => {
    setLoading(true);
    setError(null);
    try {
      const newGrade = await addGrade(gradeObj);
      setGrades(g => [newGrade, ...g]);
      return newGrade;
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete
  const remove = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      await deleteGrade(id);
      setGrades(g => g.filter(gr => gr.id !== id));
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update
  const update = useCallback(async (id, fields) => {
    setLoading(true);
    setError(null);
    try {
      const updated = await updateGrade(id, fields);
      setGrades(g => g.map(gr => gr.id === id ? updated : gr));
      return updated;
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return { grades, loading, error, add, remove, update, setGrades };
}
