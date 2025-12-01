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

  // Charger les notes semestrielles au montage
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
        
        // Convertir le format Supabase vers le format local
        // Format local: { "Matière": { 1: 5.5, 2: 5.0 } }
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
        console.error('Erreur chargement semester_grades:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSemesterGrades();
  }, [user]);

  // Fonction pour ajouter/mettre à jour une note semestrielle
  const upsert = async ({ subject_id, semester_number, grade }) => {
    try {
      await upsertSemesterGrade({ subject_id, semester_number, grade });
      
      // Recharger les données
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
      console.error('Erreur upsert semester_grade:', err);
      throw err;
    }
  };

  // Fonction pour supprimer une note semestrielle
  const remove = async (id) => {
    try {
      await deleteSemesterGrade(id);
      
      // Recharger les données
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
      console.error('Erreur suppression semester_grade:', err);
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
