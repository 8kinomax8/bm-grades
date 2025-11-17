# BM Grades Calculator

Application de calcul et de suivi des notes pour la Berufsmaturität (BM).

## 📁 Structure du Projet

```
bm-grades/
├── public/                 # Fichiers statiques publics
│   └── assets/            # Images et ressources
│       └── react.svg
│
├── src/
│   ├── constants/         # Constantes et configurations
│   │   ├── index.js      # Exports centralisés
│   │   └── subjects.js   # Matières BM, examens, lektionentafel
│   │
│   ├── features/          # Fonctionnalités par domaine
│   │   └── calculator/   # Calculateur de notes
│   │       ├── components/
│   │       └── hooks/
│   │
│   ├── styles/           # Styles CSS globaux
│   │   ├── App.css
│   │   └── index.css
│   │
│   ├── utils/            # Fonctions utilitaires
│   │   ├── index.js
│   │   ├── storage.js    # Gestion localStorage
│   │   └── grades.js     # Calculs de notes
│   │
│   ├── App.jsx           # Composant principal
│   └── main.jsx          # Point d'entrée
│
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── README.md
```

## 🚀 Démarrage

```bash
# Installation des dépendances
npm install

# Développement
npm run dev

# Build production
npm run build

# Aperçu production
npm run preview
```

## 📚 Organisation des Dossiers

### `/src/constants`
Contient toutes les constantes de configuration : matières BM, examens, lektionentafel.

### `/src/features`
Organisation par fonctionnalité avec composants, hooks et logique métier.

### `/src/utils`
Fonctions utilitaires réutilisables (calculs, storage, formatage).

### `/src/styles`
Styles CSS globaux et configuration Tailwind.

## 🛠️ Technologies

- React 19
- Vite 7
- Tailwind CSS
- Recharts (graphiques)
- Lucide React (icônes)
