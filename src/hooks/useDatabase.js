import { useAuth } from 'react-oidc-context';
import * as db from '../services/databaseService';
import { useState, useCallback } from 'react';

/**
 * Custom hook to manage database operations
 * Handles user sync, grades, semester plans, goals, and exam simulations
 */
export function useDatabase() {
  const auth = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Cognito OIDC stores sub in profile
  const userId = auth.user?.profile?.sub || auth.user?.sub;
  const userEmail = auth.user?.profile?.email || auth.user?.email;
  const userName = auth.user?.profile?.name || auth.user?.profile?.email?.split('@')[0];

  // Sync user to database
  const syncUser = useCallback(async (bmType = 'TAL') => {
    if (!userId || !userEmail) return null;
    
    setLoading(true);
    setError(null);
    try {
      const displayName = userName || userEmail.split('@')[0];
      return await db.syncUser(userId, userEmail, displayName, bmType);
    } catch (err) {
      setError(err.message);
      console.error('Error syncing user:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, userEmail, userName]);

  // ============================================
  // GRADES
  // ============================================

  const addGrade = useCallback(async (subjectName, grade, weight, semester, controlName = null, controlDate = null) => {
    if (!userId) return null;
    
    setLoading(true);
    setError(null);
    try {
      return await db.addGrade(userId, subjectName, grade, weight, semester, controlName, controlDate);
    } catch (err) {
      setError(err.message);
      console.error('Error adding grade:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const removeGrade = useCallback(async (gradeId) => {
    if (!userId) return null;
    
    setLoading(true);
    setError(null);
    try {
      return await db.removeGrade(userId, gradeId);
    } catch (err) {
      setError(err.message);
      console.error('Error removing grade:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const getUserGrades = useCallback(async (semester = null, subject = null) => {
    if (!userId) return [];
    
    setLoading(true);
    setError(null);
    try {
      return await db.getUserGrades(userId, semester, subject);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching grades:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // ============================================
  // SEMESTER GRADES
  // ============================================

  const setSemesterGrade = useCallback(async (subjectName, semester, grade) => {
    if (!userId) return null;
    
    setLoading(true);
    setError(null);
    try {
      return await db.setSemesterGrade(userId, subjectName, semester, grade);
    } catch (err) {
      setError(err.message);
      console.error('Error setting semester grade:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const getUserSemesterGrades = useCallback(async (semester = null) => {
    if (!userId) return [];
    
    setLoading(true);
    setError(null);
    try {
      return await db.getUserSemesterGrades(userId, semester);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching semester grades:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // ============================================
  // SEMESTER PLANS
  // ============================================

  const addSemesterPlan = useCallback(async (subjectName, semester, plannedGrade, weight = 1, description = null) => {
    if (!userId) return null;
    
    setLoading(true);
    setError(null);
    try {
      return await db.addSemesterPlan(userId, subjectName, semester, plannedGrade, weight, description);
    } catch (err) {
      setError(err.message);
      console.error('Error adding semester plan:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const removeSemesterPlan = useCallback(async (planId) => {
    if (!userId) return null;
    
    setLoading(true);
    setError(null);
    try {
      return await db.removeSemesterPlan(userId, planId);
    } catch (err) {
      setError(err.message);
      console.error('Error removing semester plan:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const getUserSemesterPlans = useCallback(async (semester = null) => {
    if (!userId) return [];
    
    setLoading(true);
    setError(null);
    try {
      return await db.getUserSemesterPlans(userId, semester);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching semester plans:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // ============================================
  // SUBJECT GOALS
  // ============================================

  const setSubjectGoal = useCallback(async (subjectName, targetGrade) => {
    if (!userId) return null;
    
    setLoading(true);
    setError(null);
    try {
      return await db.setSubjectGoal(userId, subjectName, targetGrade);
    } catch (err) {
      setError(err.message);
      console.error('Error setting subject goal:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const removeSubjectGoal = useCallback(async (subjectName) => {
    if (!userId) return null;
    
    setLoading(true);
    setError(null);
    try {
      return await db.removeSubjectGoal(userId, subjectName);
    } catch (err) {
      setError(err.message);
      console.error('Error removing subject goal:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const getUserSubjectGoals = useCallback(async () => {
    if (!userId) return [];
    
    setLoading(true);
    setError(null);
    try {
      return await db.getUserSubjectGoals(userId);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching subject goals:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // ============================================
  // EXAM SIMULATOR
  // ============================================

  const setExamGrade = useCallback(async (subjectName, simulatedGrade) => {
    if (!userId) return null;
    
    setLoading(true);
    setError(null);
    try {
      return await db.setExamGrade(userId, subjectName, simulatedGrade);
    } catch (err) {
      setError(err.message);
      console.error('Error setting exam grade:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const removeExamGrade = useCallback(async (subjectName) => {
    if (!userId) return null;
    
    setLoading(true);
    setError(null);
    try {
      return await db.removeExamGrade(userId, subjectName);
    } catch (err) {
      setError(err.message);
      console.error('Error removing exam grade:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const getUserExamGrades = useCallback(async () => {
    if (!userId) return [];
    
    setLoading(true);
    setError(null);
    try {
      return await db.getUserExamGrades(userId);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching exam grades:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [userId]);

  return {
    loading,
    error,
    userId,
    syncUser,
    addGrade,
    removeGrade,
    getUserGrades,
    setSemesterGrade,
    getUserSemesterGrades,
    addSemesterPlan,
    removeSemesterPlan,
    getUserSemesterPlans,
    setSubjectGoal,
    removeSubjectGoal,
    getUserSubjectGoals,
    setExamGrade,
    removeExamGrade,
    getUserExamGrades
  };
}
