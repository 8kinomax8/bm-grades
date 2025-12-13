import express from 'express';
import * as queries from './queries.js';

const router = express.Router();

// ============================================
// USERS
// ============================================

router.post('/users/sync', async (req, res) => {
  try {
    const { cognitoSub, email, displayName, bmType } = req.body;
    
    if (!cognitoSub || !email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const user = await queries.upsertUser(cognitoSub, email, displayName, bmType);
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/users/:userId', async (req, res) => {
  try {
    const user = await queries.getUserById(req.params.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/users/:userId/bm-type', async (req, res) => {
  try {
    const { bmType } = req.body;
    const user = await queries.updateUserBmType(req.params.userId, bmType);
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/users/:userId/semester', async (req, res) => {
  try {
    const { semester } = req.body;
    const user = await queries.updateUserCurrentSemester(req.params.userId, semester);
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/users/:userId/maturanote-goal', async (req, res) => {
  try {
    const { goal } = req.body;
    const user = await queries.updateUserMaturanoteGoal(req.params.userId, goal);
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// GRADES
// ============================================

router.post('/users/:userId/grades', async (req, res) => {
  try {
    const { subjectName, grade, weight, semester, controlName, controlDate, source } = req.body;
    
    if (!subjectName || !grade || !semester) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const result = await queries.addGrade(
      req.params.userId,
      subjectName,
      grade,
      weight || 1,
      semester,
      controlName,
      controlDate,
      source
    );
    
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/users/:userId/grades/:gradeId', async (req, res) => {
  try {
    await queries.removeGrade(req.params.gradeId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/users/:userId/grades', async (req, res) => {
  try {
    const { semester, subject } = req.query;
    const grades = await queries.getUserGrades(
      req.params.userId,
      semester ? parseInt(semester) : null,
      subject
    );
    res.json(grades);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// SEMESTER GRADES
// ============================================

router.post('/users/:userId/semester-grades', async (req, res) => {
  try {
    const { subjectName, semester, grade, isUserSet } = req.body;
    
    if (!subjectName || !semester || !grade) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const result = await queries.setSemesterGrade(
      req.params.userId,
      subjectName,
      semester,
      grade,
      isUserSet || false
    );
    
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/users/:userId/semester-grades', async (req, res) => {
  try {
    const { semester } = req.query;
    const grades = await queries.getUserSemesterGrades(
      req.params.userId,
      semester ? parseInt(semester) : null
    );
    res.json(grades);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// SEMESTER PLANS
// ============================================

router.post('/users/:userId/semester-plans', async (req, res) => {
  try {
    const { subjectName, semester, plannedGrade, weight, description } = req.body;
    
    if (!subjectName || !semester || !plannedGrade) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const result = await queries.addSemesterPlan(
      req.params.userId,
      subjectName,
      semester,
      plannedGrade,
      weight || 1,
      description
    );
    
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/users/:userId/semester-plans/:planId', async (req, res) => {
  try {
    await queries.removeSemesterPlan(req.params.planId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/users/:userId/semester-plans', async (req, res) => {
  try {
    const { semester } = req.query;
    const plans = await queries.getUserSemesterPlans(
      req.params.userId,
      semester ? parseInt(semester) : null
    );
    res.json(plans);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// SUBJECT GOALS
// ============================================

router.post('/users/:userId/subject-goals', async (req, res) => {
  try {
    const { subjectName, targetGrade } = req.body;
    
    if (!subjectName || !targetGrade) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const result = await queries.setSubjectGoal(
      req.params.userId,
      subjectName,
      targetGrade
    );
    
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/users/:userId/subject-goals/:subjectName', async (req, res) => {
  try {
    await queries.removeSubjectGoal(req.params.userId, req.params.subjectName);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/users/:userId/subject-goals', async (req, res) => {
  try {
    const goals = await queries.getUserSubjectGoals(req.params.userId);
    res.json(goals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// EXAM SIMULATOR
// ============================================

router.post('/users/:userId/exam-grades', async (req, res) => {
  try {
    const { subjectName, simulatedGrade } = req.body;
    
    if (!subjectName || !simulatedGrade) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const result = await queries.setExamGrade(
      req.params.userId,
      subjectName,
      simulatedGrade
    );
    
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/users/:userId/exam-grades/:subjectName', async (req, res) => {
  try {
    await queries.removeExamGrade(req.params.userId, req.params.subjectName);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/users/:userId/exam-grades', async (req, res) => {
  try {
    const grades = await queries.getUserExamGrades(req.params.userId);
    res.json(grades);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// SUBJECTS
// ============================================

router.get('/subjects', async (req, res) => {
  try {
    const subjects = await queries.getAllSubjects();
    res.json(subjects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/subjects/:bmType', async (req, res) => {
  try {
    const subjects = await queries.getSubjectsByBmType(req.params.bmType);
    res.json(subjects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
