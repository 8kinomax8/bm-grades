/**
 * Calcule la moyenne des notes
 * @param {number[]} grades - Tableau de notes
 * @returns {number} Moyenne arrondie à 2 décimales
 */
export const calculateAverage = (grades) => {
  if (!grades || grades.length === 0) return 0;
  const validGrades = grades.filter(g => g > 0);
  if (validGrades.length === 0) return 0;
  const sum = validGrades.reduce((acc, grade) => acc + grade, 0);
  return Math.round((sum / validGrades.length) * 100) / 100;
};

/**
 * Arrondit une note selon les règles BM (0.5)
 * @param {number} grade - Note à arrondir
 * @returns {number} Note arrondie
 */
export const roundGrade = (grade) => {
  return Math.round(grade * 2) / 2;
};

/**
 * Vérifie si une note est valide (entre 1 et 6)
 * @param {number} grade - Note à vérifier
 * @returns {boolean}
 */
export const isValidGrade = (grade) => {
  return grade >= 1 && grade <= 6;
};

/**
 * Formatte une note pour l'affichage
 * @param {number} grade - Note à formatter
 * @returns {string} Note formatée
 */
export const formatGrade = (grade) => {
  if (!grade || grade === 0) return '-';
  return grade.toFixed(2);
};
