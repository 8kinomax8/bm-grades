/**
 * Matières BM par type et catégorie
 */
export const BM_SUBJECTS = {
  TAL: {
    grundlagen: ['Deutsch', 'Englisch', 'Französisch', 'Mathematik'],
    schwerpunkt: ['Naturwissenschaften'],
    erganzung: ['Geschichte und Politik', 'Wirtschaft und Recht'],
    interdisziplinar: ['Interdisziplinäres Arbeiten']
  },
  DL: {
    grundlagen: ['Deutsch', 'Englisch', 'Französisch', 'Mathematik'],
    schwerpunkt: ['Finanz- und Rechnungswesen', 'Wirtschaft und Recht'],
    erganzung: ['Geschichte und Politik'],
    interdisziplinar: ['Interdisziplinäres Arbeiten']
  }
};

/**
 * Matières d'examen par type BM
 */
export const EXAM_SUBJECTS = {
  TAL: ['Deutsch', 'Englisch', 'Französisch', 'Mathematik', 'Naturwissenschaften'],
  DL: ['Deutsch', 'Englisch', 'Französisch', 'Mathematik', 'Finanz- und Rechnungswesen', 'Wirtschaft und Recht']
};

/**
 * Lektionentafel - Semestres où chaque matière est enseignée
 */
export const LEKTIONENTAFEL = {
  TAL: {
    'Deutsch': [1, 2, 5, 6, 7, 8],
    'Englisch': [3, 4, 5, 6, 7, 8],
    'Französisch': [1, 2, 3],
    'Mathematik': [1, 2, 3, 4, 5, 6, 7, 8],
    'Naturwissenschaften': [3, 4, 5, 6, 7, 8],
    'Geschichte und Politik': [4, 5, 6],
    'Wirtschaft und Recht': [1, 2],
    'Interdisziplinäres Arbeiten': [1, 2, 3, 4, 5, 6, 7, 8]
  },
  DL: {
    'Deutsch': [1, 2, 5, 6, 7, 8],
    'Englisch': [3, 4, 5, 6, 7, 8],
    'Französisch': [1, 2, 3],
    'Mathematik': [1, 2, 3, 4],
    'Finanz- und Rechnungswesen': [3, 4, 5, 6, 7, 8],
    'Wirtschaft und Recht': [1, 2],
    'Geschichte und Politik': [4, 5, 6],
    'Interdisziplinäres Arbeiten': [1, 2, 3, 4, 5, 6, 7, 8]
  }
};
