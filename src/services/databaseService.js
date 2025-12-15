import { FRONTEND_CONFIG } from '../../config.js';

const API_BASE = `${FRONTEND_CONFIG.API_URL}/api`;

// ============================================
// USERS
// ============================================

export async function syncUser(cognitoSub, email, displayName, bmType = 'TAL') {
  const response = await fetch(`${API_BASE}/users/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cognitoSub, email, displayName, bmType })
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function getUser(userId) {
  const response = await fetch(`${API_BASE}/users/${userId}`);
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function updateUserBmType(userId, bmType) {
  const response = await fetch(`${API_BASE}/users/${userId}/bm-type`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bmType })
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function updateUserSemester(userId, semester) {
  const response = await fetch(`${API_BASE}/users/${userId}/semester`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ semester })
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function updateUserMaturanoteGoal(userId, goal) {
  const response = await fetch(`${API_BASE}/users/${userId}/maturanote-goal`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ goal })
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

// ============================================
// GRADES
// ============================================

export async function addGrade(userId, subjectName, grade, weight, semester, controlName = null, controlDate = null) {
  const response = await fetch(`${API_BASE}/users/${userId}/grades`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subjectName, grade, weight, semester, controlName, controlDate })
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function removeGrade(userId, gradeId) {
  const response = await fetch(`${API_BASE}/users/${userId}/grades/${gradeId}`, {
    method: 'DELETE'
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function getUserGrades(userId, semester = null, subject = null) {
  let url = `${API_BASE}/users/${userId}/grades`;
  const params = new URLSearchParams();
  if (semester !== null) params.append('semester', semester);
  if (subject) params.append('subject', subject);
  if (params.toString()) url += '?' + params.toString();
  
  const response = await fetch(url);
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

// ============================================
// SEMESTER GRADES
// ============================================

export async function setSemesterGrade(userId, subjectName, semester, grade) {
  const response = await fetch(`${API_BASE}/users/${userId}/semester-grades`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subjectName, semester, grade, isUserSet: true })
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function getUserSemesterGrades(userId, semester = null) {
  let url = `${API_BASE}/users/${userId}/semester-grades`;
  if (semester !== null) url += `?semester=${semester}`;
  
  const response = await fetch(url);
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

// ============================================
// SEMESTER PLANS
// ============================================

export async function addSemesterPlan(userId, subjectName, semester, plannedGrade, weight = 1, description = null) {
  const response = await fetch(`${API_BASE}/users/${userId}/semester-plans`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subjectName, semester, plannedGrade, weight, description })
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function removeSemesterPlan(userId, planId) {
  const response = await fetch(`${API_BASE}/users/${userId}/semester-plans/${planId}`, {
    method: 'DELETE'
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function getUserSemesterPlans(userId, semester = null) {
  let url = `${API_BASE}/users/${userId}/semester-plans`;
  if (semester !== null) url += `?semester=${semester}`;
  
  const response = await fetch(url);
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

// ============================================
// SUBJECT GOALS
// ============================================

export async function setSubjectGoal(userId, subjectName, targetGrade) {
  const response = await fetch(`${API_BASE}/users/${userId}/subject-goals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subjectName, targetGrade })
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function removeSubjectGoal(userId, subjectName) {
  const response = await fetch(`${API_BASE}/users/${userId}/subject-goals/${subjectName}`, {
    method: 'DELETE'
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function getUserSubjectGoals(userId) {
  const response = await fetch(`${API_BASE}/users/${userId}/subject-goals`);
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

// ============================================
// EXAM SIMULATOR
// ============================================

export async function setExamGrade(userId, subjectName, simulatedGrade) {
  const response = await fetch(`${API_BASE}/users/${userId}/exam-grades`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subjectName, simulatedGrade })
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function removeExamGrade(userId, subjectName) {
  const response = await fetch(`${API_BASE}/users/${userId}/exam-grades/${subjectName}`, {
    method: 'DELETE'
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function getUserExamGrades(userId) {
  const response = await fetch(`${API_BASE}/users/${userId}/exam-grades`);
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

// ============================================
// SUBJECTS
// ============================================

export async function getAllSubjects() {
  const response = await fetch(`${API_BASE}/subjects`);
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function getSubjectsByBmType(bmType) {
  const response = await fetch(`${API_BASE}/subjects/${bmType}`);
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}
