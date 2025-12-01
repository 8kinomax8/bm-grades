# Architecture de l'Application BM Grades

## 📁 Structure du Projet

```
src/
├── components/              # Composants UI réutilisables
│   ├── GradeCard.jsx       # Carte pour afficher/ajouter des notes
│   ├── SemesterSimulatorCard.jsx  # Simulateur de semestre
│   ├── BulletinAnalysis.jsx       # Analyse de bulletins/SAL
│   ├── PromotionStatus.jsx        # Statut de promotion BM1
│   └── index.js            # Export centralisé
│
├── hooks/                   # Custom React Hooks
│   ├── useDataPersistence.js      # Sauvegarde localStorage
│   ├── useGradeCalculations.js    # Calculs de moyennes
│   ├── useBulletinAnalysis.js     # Analyse via API
│   └── index.js            # Export centralisé
│
├── services/                # Logique métier et API
│   ├── calculationService.js      # Calculs de notes
│   ├── apiService.js              # Communication avec le backend
│   └── index.js            # Export centralisé
│
├── utils/                   # Utilitaires
│   ├── storage.js          # Gestion localStorage
│   ├── grades.js           # Utilitaires de notes
│   └── index.js
│
├── constants/               # Constantes de l'application
│   ├── subjects.js         # Matières BM
│   └── index.js
│
├── styles/                  # Styles CSS
│   ├── App.css
│   └── index.css
│
└── App.jsx                  # Composant principal (orchestrateur)
```

## 🧩 Description des Modules

### **Components** (`src/components/`)
Composants UI réutilisables et isolés.

- **GradeCard**: Affiche et gère les notes d'une matière
  - Ajout/suppression de notes
  - Calcul de la moyenne
  - Indication de la note requise

- **SemesterSimulatorCard**: Simule une moyenne semestrielle
  - Ajout de contrôles planifiés
  - Calcul de notes requises
  - Objectifs personnalisables

- **BulletinAnalysis**: Interface pour scanner des bulletins
  - Upload de fichiers (PDF/images)
  - Affichage des résultats d'analyse
  - Support SAL et bulletins

- **PromotionStatus**: Affiche le statut de promotion BM1
  - 3 conditions de promotion
  - Moyenne, déficit, notes insuffisantes
  - Indication visuelle (promu/non promu)

### **Hooks** (`src/hooks/`)
Logique réutilisable avec React Hooks.

- **useDataPersistence**: Sauvegarde automatique dans localStorage
  - Auto-save lors des changements
  - Chargement au démarrage

- **useGradeCalculations**: Tous les calculs de notes
  - Moyennes semestrielles
  - Erfahrungsnote
  - Notes requises
  - Statut de promotion

- **useBulletinAnalysis**: Analyse de bulletins via API
  - Upload et conversion base64
  - Appel API Anthropic
  - Traitement SAL vs Bulletin
  - Détection de doublons

### **Services** (`src/services/`)
Logique métier pure (pas de React).

- **calculationService.js**: Fonctions de calcul
  - `calculateWeightedAverage()`: Moyenne pondérée
  - `roundToHalfOrWhole()`: Arrondi au demi-point
  - `calculateErfahrungsnote()`: Note d'expérience
  - `calculatePromotionStatus()`: Statut BM1

- **apiService.js**: Communication avec le backend
  - `analyzeBulletin()`: Appel API pour analyse
  - `normalizeSubjectName()`: Normalisation des matières
  - `processSALScan()`: Traitement scan SAL
  - `processBulletinScan()`: Traitement scan bulletin

## 🔄 Flux de Données

### 1. Analyse de Bulletin
```
User → BulletinAnalysis → useBulletinAnalysis → apiService → Backend API
                                                           ↓
                                              processSALScan / processBulletinScan
                                                           ↓
                                              Update subjects/semesterGrades
                                                           ↓
                                              useDataPersistence (auto-save)
```

### 2. Calcul de Notes
```
User input → GradeCard → addGrade() → subjects state
                                          ↓
                              useGradeCalculations → calculationService
                                          ↓
                              Display in UI (GradeCard, PromotionStatus)
```

### 3. Simulation
```
User → SemesterSimulatorCard → addPlannedControl() → semesterPlans state
                                                           ↓
                                            useGradeCalculations.getSimulatedSemesterAverage()
                                                           ↓
                                            Display moyenne simulée
```

## 📊 Avantages de cette Architecture

### ✅ **Séparation des Responsabilités**
- UI (components) séparée de la logique métier (services)
- État React isolé dans des hooks réutilisables
- Facilite les tests unitaires

### ✅ **Réutilisabilité**
- Composants indépendants et réutilisables
- Hooks partageables entre composants
- Services utilisables hors de React

### ✅ **Maintenabilité**
- Code organisé et facile à naviguer
- Modifications localisées (1 fichier = 1 responsabilité)
- Moins de risques de régression

### ✅ **Testabilité**
- Services purs testables sans React
- Composants isolés testables avec React Testing Library
- Hooks testables avec @testing-library/react-hooks

### ✅ **Performance**
- Imports optimisés (tree-shaking)
- Re-renders minimisés (hooks ciblés)
- Lazy loading possible

## 🛠️ Comment Ajouter une Nouvelle Fonctionnalité

### Exemple : Ajouter un nouveau type de graphique

1. **Créer le composant** : `src/components/NewChart.jsx`
2. **Ajouter la logique** : Dans `useGradeCalculations` si nécessaire
3. **Exporter** : Ajouter dans `src/components/index.js`
4. **Utiliser** : Importer dans `App.jsx`

```jsx
// src/components/NewChart.jsx
export default function NewChart({ data }) {
  return <div>...</div>;
}

// src/components/index.js
export { default as NewChart } from './NewChart';

// src/App.jsx
import { NewChart } from './components';
```

## 🧪 Tests (à implémenter)

```bash
# Structure de tests suggérée
src/
├── services/
│   ├── calculationService.js
│   └── calculationService.test.js
├── hooks/
│   ├── useGradeCalculations.js
│   └── useGradeCalculations.test.js
└── components/
    ├── GradeCard.jsx
    └── GradeCard.test.jsx
```

## 📝 Migrations Futures Possibles

1. **TypeScript** : Ajouter des types pour plus de sécurité
2. **State Management** : Zustand/Redux si l'état devient complexe
3. **React Query** : Pour la gestion des requêtes API
4. **Storybook** : Pour documenter les composants
5. **Vitest** : Pour les tests unitaires

## 🎯 Prochaines Étapes

- [ ] Ajouter des tests unitaires
- [ ] Migrer vers TypeScript
- [ ] Optimiser les re-renders avec React.memo
- [ ] Ajouter un système de notifications
- [ ] Implémenter un mode offline complet
