/**
 * Service de calculs pour les moyennes et notes
 */

/**
 * Calcule la moyenne pondérée d'un ensemble de notes
 * @param {Array} grades - Tableau de notes avec {grade, weight}
 * @returns {number|null} Moyenne pondérée ou null si pas de notes
 */
export const calculateWeightedAverage = (grades) => {
  if (!grades || grades.length === 0) return null;
  const totalWeight = grades.reduce((sum, g) => sum + g.weight, 0);
  const weightedSum = grades.reduce((sum, g) => sum + (g.grade * g.weight), 0);
  return totalWeight > 0 ? weightedSum / totalWeight : null;
};

/**
 * Arrondit une valeur au demi-point ou point entier le plus proche
 * @param {number} value - Valeur à arrondir
 * @returns {number} Valeur arrondie
 */
export const roundToHalfOrWhole = (value) => {
  return Math.round(value * 2) / 2;
};

/**
 * Arrondit une valeur au dixième le plus proche
 * @param {number} value - Valeur à arrondir
 * @returns {number} Valeur arrondie au dixième
 */
export const roundToTenth = (value) => {
  return Math.round(value * 10) / 10;
};

/**
 * Calcule la moyenne semestrielle d'une matière
 * @param {Array} grades - Notes de la matière
 * @returns {number|null} Moyenne arrondie ou null
 */
export const calculateSemesterAverage = (grades) => {
  const avg = calculateWeightedAverage(grades);
  return avg ? roundToHalfOrWhole(avg) : null;
};

/**
 * Calcule l'Erfahrungsnote (note d'expérience) basée sur les moyennes semestrielles
 * @param {Object} semesterGrades - Object avec les notes par semestre {1: 5.5, 2: 5.0, ...}
 * @returns {number|null} Erfahrungsnote arrondie ou null
 */
export const calculateErfahrungsnote = (semesterGrades) => {
  if (!semesterGrades) return null;
  const values = Object.values(semesterGrades);
  if (values.length === 0) return null;
  const avg = values.reduce((sum, g) => sum + g, 0) / values.length;
  return roundToHalfOrWhole(avg);
};

/**
 * Calcule la note requise pour atteindre une moyenne cible
 * @param {Array} currentGrades - Notes actuelles
 * @param {number} targetAverage - Moyenne cible
 * @param {number} nextWeight - Pondération du prochain contrôle
 * @returns {number|null} Note requise ou null
 */
export const calculateRequiredGrade = (currentGrades, targetAverage, nextWeight = 1) => {
  if (!currentGrades || currentGrades.length === 0) return null;
  
  const currentTotalWeight = currentGrades.reduce((sum, g) => sum + g.weight, 0);
  const totalWeight = currentTotalWeight + nextWeight;
  const currentSum = currentGrades.reduce((sum, g) => sum + (g.grade * g.weight), 0);
  
  return (targetAverage * totalWeight - currentSum) / nextWeight;
};

/**
 * Simule une moyenne avec des contrôles planifiés
 * @param {Array} currentGrades - Notes actuelles
 * @param {Array} plannedControls - Contrôles planifiés
 * @returns {number|null} Moyenne simulée
 */
export const simulateAverage = (currentGrades, plannedControls) => {
  const allGrades = [
    ...(currentGrades || []),
    ...(plannedControls || []).map(p => ({ grade: parseFloat(p.grade), weight: parseFloat(p.weight) }))
  ];
  return calculateWeightedAverage(allGrades);
};

/**
 * Parse une pondération en format texte vers un nombre
 * @param {string|number} weight - Pondération (ex: "1/2", "50%", "1.5")
 * @returns {number} Pondération en nombre décimal
 */
export const parseWeight = (weight) => {
  if (typeof weight === 'number') return weight;
  if (typeof weight !== 'string') return parseFloat(weight);
  
  if (weight.includes('/')) {
    const [num, den] = weight.split('/').map(n => parseFloat(n.trim()));
    return num / den;
  }
  if (weight.includes('%')) {
    return parseFloat(weight.replace('%', '').trim()) / 100;
  }
  return parseFloat(weight);
};

/**
 * Calcule le statut de promotion semestrielle (règles BM1)
 * @param {Object} semesterGrades - Notes semestrielles par matière
 * @param {string} bmType - Type de BM (TAL, WMU, etc.)
 * @returns {Object} Statut avec {average, deficit, insufficientCount, isPromoted}
 */
export const calculatePromotionStatus = (semesterGrades, bmType) => {
  if (!semesterGrades) {
    return { average: null, deficit: null, insufficientCount: null, isPromoted: null };
  }

  // Exclude IDAF from calculation
  const gradesWithoutIDAF = Object.entries(semesterGrades)
    .filter(([subject]) => subject !== 'Interdisziplinäres Arbeiten in den Fächern');

  if (gradesWithoutIDAF.length === 0) {
    return { average: null, deficit: null, insufficientCount: null, isPromoted: null };
  }

  // Overall average (rounded to tenth, not half-point)
  const sum = gradesWithoutIDAF.reduce((acc, [, grade]) => acc + grade, 0);
  const average = roundToTenth(sum / gradesWithoutIDAF.length);

  // Total deficit
  const deficit = gradesWithoutIDAF.reduce((acc, [, grade]) => {
    return grade < 4 ? acc + (4 - grade) : acc;
  }, 0);

  // Number of insufficient grades (< 4)
  const insufficientCount = gradesWithoutIDAF.filter(([, grade]) => grade < 4).length;

  // Promotion conditions (BM1)
  const condition1 = average >= 4.0;
  const condition2 = deficit <= 2.0;
  const condition3 = insufficientCount <= 2;
  const isPromoted = condition1 && condition2 && condition3;

  return {
    average,
    deficit: parseFloat(deficit.toFixed(1)),
    insufficientCount,
    isPromoted,
    conditions: {
      averageOk: condition1,
      deficitOk: condition2,
      insufficientOk: condition3
    }
  };
};
