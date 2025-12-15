/**
 * Service API pour l'analyse des bulletins et screenshots SAL
 */

import { FRONTEND_CONFIG } from '../../config.js';

const API_URL = FRONTEND_CONFIG.API_URL;

/**
 * Convertit un fichier en base64
 * @param {File} file - Fichier à convertir
 * @returns {Promise<string>} Base64 data
 */
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Normalise le nom d'une matière selon la Lektionentafel
 * @param {string} name - Nom brut de la matière
 * @param {Set} validSubjects - Set des matières valides
 * @returns {string|null} Nom canonique ou null si invalide
 */
export const normalizeSubjectName = (name, validSubjects) => {
  if (!name) return null;
  const raw = String(name).trim();
  
  // Ignore numeric codes (e.g.: 129-INP, 202-MAT)
  if (/^\s*\d/.test(raw)) return null;
  
  const n = raw.toLowerCase();
  let canon = null;
  
  // Common mappings
  if (n.startsWith('idaf') || n === 'idaf' || n.includes('interdisziplin')) {
    canon = 'Interdisziplinäres Arbeiten in den Fächern';
  } else if (n === 'frw' || n.includes('finanz')) {
    canon = 'Finanz- und Rechnungswesen';
  } else if (n === 'wr' || n.includes('wirtschaft und recht')) {
    canon = 'Wirtschaft und Recht';
  } else if (n.startsWith('geschichte')) {
    canon = 'Geschichte und Politik';
  } else if (n.startsWith('mathematik')) {
    canon = 'Mathematik';
  } else if (n.startsWith('deutsch')) {
    canon = 'Deutsch';
  } else if (n.startsWith('englisch')) {
    canon = 'Englisch';
  } else if (n.startsWith('franz')) {
    canon = 'Französisch';
  } else if (n.includes('natur')) {
    canon = 'Naturwissenschaften';
  }
  
  if (canon) return validSubjects.has(canon) ? canon : null;
  
  // Try an exact match
  const candidate = raw.replace(/\s+/g, ' ');
  return validSubjects.has(candidate) ? candidate : null;
};

/**
 * Analyse un bulletin ou screenshot SAL via l'API
 * @param {File} file - Fichier image/PDF à analyser
 * @param {string} scanType - Type de scan ('SAL' ou 'Bulletin')
 * @returns {Promise<Object>} Résultat de l'analyse
 */
export const analyzeBulletin = async (file, scanType = 'Bulletin') => {
  try {
    const base64Data = await fileToBase64(file);
    
    const response = await fetch(`${API_URL}/api/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        image: `data:${file.type};base64,${base64Data}`,
        scanType
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Erreur HTTP: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.content || !data.content[0] || !data.content[0].text) {
      throw new Error('Invalid API response: ' + JSON.stringify(data));
    }
    
    const textContent = data.content[0].text;
    const cleanText = textContent.replace(/```json|```/g, '').trim();
    const result = JSON.parse(cleanText);

    return result;
  } catch (error) {
    console.error('Analysis error:', error);
    throw error;
  }
};

/**
 * Traite le résultat d'un scan SAL et retourne les contrôles à ajouter
 * @param {Object} result - Résultat de l'API
 * @param {Object} currentSubjects - Matières actuelles
 * @param {Set} validSubjects - Set des matières valides
 * @returns {Object} {updatedSubjects, addedControls}
 */
export const processSALScan = (result, currentSubjects, validSubjects) => {
  const newSubjects = { ...currentSubjects };
  const addedControls = [];

  if (!result.controls) {
    return { updatedSubjects: newSubjects, addedControls };
  }

  result.controls.forEach((control) => {
    const canon = normalizeSubjectName(control.subject, validSubjects);
    if (!canon) return;
    
    // Create a unique identifier based on subject + date + grade
    const controlId = `${canon}-${control.date}-${control.grade}`;
    
    // Check if this assessment already exists
    const existingGrades = newSubjects[canon] || [];
    const alreadyExists = existingGrades.some(g => 
      g.controlId === controlId || 
      (g.date === control.date && Math.abs(g.grade - control.grade) < 0.01)
    );
    
    if (!alreadyExists) {
      if (!newSubjects[canon]) newSubjects[canon] = [];
      newSubjects[canon] = [...newSubjects[canon], {
        grade: parseFloat(control.grade),
        weight: 1,
        displayWeight: '1',
        date: control.date,
        name: control.name || '',
        controlId: controlId,
        id: Date.now() + Math.random()
      }];
      addedControls.push({ subject: canon, ...control });
    }
  });

  return { updatedSubjects: newSubjects, addedControls };
};

/**
 * Traite le résultat d'un scan de bulletin et retourne les notes semestrielles
 * @param {Object} result - Résultat de l'API
 * @param {Object} currentSemesterGrades - Notes semestrielles actuelles
 * @param {Set} validSubjects - Set des matières valides
 * @param {number} currentSemester - Semestre actuel
 * @returns {Object} {updatedSemesterGrades, mappedGrades, semester}
 */
export const processBulletinScan = (result, currentSemesterGrades, validSubjects, currentSemester) => {
  const mappedGrades = {};
  const grades = result.grades || {};
  
  Object.entries(grades).forEach(([k, v]) => {
    const canon = normalizeSubjectName(k, validSubjects);
    if (!canon) return;
    mappedGrades[canon] = parseFloat(v);
  });

  const semester = result.semester ?? currentSemester;
  const updatedSemesterGrades = { ...currentSemesterGrades };
  
  Object.entries(mappedGrades).forEach(([subject, grade]) => {
    if (!updatedSemesterGrades[subject]) {
      updatedSemesterGrades[subject] = {};
    }
    updatedSemesterGrades[subject][semester] = grade;
  });

  return { updatedSemesterGrades, mappedGrades, semester };
};
