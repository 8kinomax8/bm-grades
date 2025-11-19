import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Target, Calculator, Book, TrendingUp, Save, ChevronDown, ChevronUp, Camera, Upload, BarChart } from 'lucide-react';
import { LineChart, Line, BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { storage } from './utils/storage';
import { BM_SUBJECTS, EXAM_SUBJECTS, LEKTIONENTAFEL } from './constants';
import './styles/App.css';

export default function BMGradeCalculator() {
  const [bmType, setBmType] = useState('TAL');
  const [currentSemester, setCurrentSemester] = useState(1);
  const [subjects, setSubjects] = useState({});
  const [semesterGrades, setSemesterGrades] = useState({});
  const [examSimulator, setExamSimulator] = useState({});
  const [expandedSubjects, setExpandedSubjects] = useState({});
  const [goalGrade, setGoalGrade] = useState(5.0);
  const [semesterSimulator, setSemesterSimulator] = useState({});
  const [semesterPlans, setSemesterPlans] = useState({});
  const [semesterGoal, setSemesterGoal] = useState(5.0);
  const [subjectGoals, setSubjectGoals] = useState({});
  const [activeTab, setActiveTab] = useState('current');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [lastScanType, setLastScanType] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    saveData();
  }, [subjects, semesterGrades, bmType, currentSemester]);

  useEffect(() => {
    // Réinitialiser le résultat d'analyse lors du changement d'onglet
    setAnalysisResult(null);
  }, [activeTab]);

  const loadData = () => {
    try {
      const data = storage.get('bm-calculator-data');
      if (data) {
        setSubjects(data.subjects || {});
        setSemesterGrades(data.semesterGrades || {});
        setBmType(data.bmType || 'TAL');
        setCurrentSemester(data.currentSemester || 1);
        setSemesterPlans(data.semesterPlans || {});
        setSubjectGoals(data.subjectGoals || {});
      }
    } catch (error) {
      console.log('Aucune donnée sauvegardée trouvée');
    }
  };

  const saveData = () => {
    try {
      storage.set('bm-calculator-data', {
        subjects,
        semesterGrades,
        bmType,
        currentSemester,
        semesterPlans,
        subjectGoals
      });
    } catch (error) {
      console.error('Erreur de sauvegarde:', error);
    }
  };

  const analyzeBulletin = async (file, scanType = 'Bulletin') => {
    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          image: `data:${file.type};base64,${base64Data}`,
          scanType: scanType
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.content || !data.content[0] || !data.content[0].text) {
        throw new Error('Réponse API invalide: ' + JSON.stringify(data));
      }
      
      const textContent = data.content[0].text;
      const cleanText = textContent.replace(/```json|```/g, '').trim();
      const result = JSON.parse(cleanText);

      if (result.error) {
        setAnalysisResult({ error: result.error });
      } else {
        // Subject normalization based on Lektionentafel for selected track
        const lekSubjects = new Set(Object.keys(LEKTIONENTAFEL[bmType] || {}));
        const normalize = (name) => {
          if (!name) return null;
          const raw = String(name).trim();
          if (/^\s*\d/.test(raw)) return null; // ignore codes like 129-INP
          const n = raw.toLowerCase();
          let canon = null;
          if (n.startsWith('idaf') || n === 'idaf' || n.includes('interdisziplin')) canon = 'Interdisziplinäres Arbeiten';
          else if (n === 'frw' || n.includes('finanz')) canon = 'Finanz- und Rechnungswesen';
          else if (n === 'wr' || n.includes('wirtschaft und recht')) canon = 'Wirtschaft und Recht';
          else if (n.startsWith('geschichte')) canon = 'Geschichte und Politik';
          else if (n.startsWith('mathematik')) canon = 'Mathematik';
          else if (n.startsWith('deutsch')) canon = 'Deutsch';
          else if (n.startsWith('englisch')) canon = 'Englisch';
          else if (n.startsWith('franz')) canon = 'Französisch';
          else if (n.includes('natur')) canon = 'Naturwissenschaften';
          if (canon) return lekSubjects.has(canon) ? canon : null;
          // Try exact canonical match
          const candidate = raw.replace(/\s+/g, ' ');
          return lekSubjects.has(candidate) ? candidate : null;
        };

        // SAL scan: traitement des contrôles individuels avec dates
        if (scanType === 'SAL' && result.controls) {
          const newSubjects = { ...subjects };
          const addedControls = [];
          
          result.controls.forEach((control) => {
            const canon = normalize(control.subject);
            if (!canon) return;
            
            // Créer un identifiant unique basé sur matière + date + note
            const controlId = `${canon}-${control.date}-${control.grade}`;
            
            // Vérifier si ce contrôle existe déjà
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
          
          setSubjects(newSubjects);
          setAnalysisResult({ 
            semester: 'current', 
            controls: addedControls,
            message: `${addedControls.length} contrôle(s) ajouté(s)`
          });
        }
        // Bulletin scan: traitement des moyennes semestrielles
        else if (result.grades) {
          const mappedGrades = {};
          const grades = result.grades || {};
          Object.entries(grades).forEach(([k, v]) => {
            const canon = normalize(k);
            if (!canon) return;
            mappedGrades[canon] = parseFloat(v);
          });

          setAnalysisResult({ semester: result.semester ?? currentSemester, grades: mappedGrades });

          if (Object.keys(mappedGrades).length > 0) {
            const sem = result.semester ?? currentSemester;
            const newSemesterGrades = { ...semesterGrades };
            Object.entries(mappedGrades).forEach(([subject, grade]) => {
              if (!newSemesterGrades[subject]) newSemesterGrades[subject] = {};
              newSemesterGrades[subject][sem] = grade;
            });
            setSemesterGrades(newSemesterGrades);
          }
        }
      }
    } catch (error) {
        console.error('Erreur analyse:', error);
        setAnalysisResult({ error: 'Erreur lors de l\'analyse de l\'image. Vérifiez le format.' });
      } finally {
        setIsAnalyzing(false);
      }
    };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // En mode "Semestre Actuel", n'autoriser que les images (screenshots SAL)
    if (activeTab === 'current') {
      if (!file.type.startsWith('image/')) {
        setAnalysisResult({ error: 'Seuls les screenshots (JPG, PNG) sont acceptés pour le semestre actuel.' });
        return;
      }
      setLastScanType('SAL');
      analyzeBulletin(file, 'SAL');
      return;
    }

    // En mode "Bulletins Précédents", autoriser image ou PDF
    if (activeTab === 'previous') {
      if (file.type.startsWith('image/') || file.type === 'application/pdf') {
        setLastScanType('Bulletin');
        analyzeBulletin(file, 'Bulletin');
      }
    }
  };

  const addGrade = (subject, grade, weight) => {
    const subjectGrades = subjects[subject] || [];
    let parsedWeight;
    if (typeof weight === 'string') {
      if (weight.includes('/')) {
        const [num, den] = weight.split('/').map(n => parseFloat(n.trim()));
        parsedWeight = num / den;
      } else if (weight.includes('%')) {
        parsedWeight = parseFloat(weight.replace('%', '').trim()) / 100;
      } else {
        parsedWeight = parseFloat(weight);
      }
    } else {
      parsedWeight = parseFloat(weight);
    }
    
    setSubjects({
      ...subjects,
      [subject]: [...subjectGrades, { grade: parseFloat(grade), weight: parsedWeight, displayWeight: weight, id: Date.now() }]
    });
  };

  const removeGrade = (subject, gradeId) => {
    setSubjects({
      ...subjects,
      [subject]: subjects[subject].filter(g => g.id !== gradeId)
    });
  };

  const calculateWeightedAverage = (grades) => {
    if (!grades || grades.length === 0) return null;
    const totalWeight = grades.reduce((sum, g) => sum + g.weight, 0);
    const weightedSum = grades.reduce((sum, g) => sum + (g.grade * g.weight), 0);
    return totalWeight > 0 ? weightedSum / totalWeight : null;
  };

  const roundToHalfOrWhole = (value) => {
    return Math.round(value * 2) / 2;
  };

  const calculateSemesterAverage = (subject) => {
    const avg = calculateWeightedAverage(subjects[subject]);
    return avg ? roundToHalfOrWhole(avg) : null;
  };

  const addSemesterGrade = (subject, semester, grade) => {
    setSemesterGrades({
      ...semesterGrades,
      [subject]: {
        ...(semesterGrades[subject] || {}),
        [semester]: parseFloat(grade)
      }
    });
  };

  const calculateErfahrungsnote = (subject) => {
    const grades = semesterGrades[subject];
    if (!grades) return null;
    const values = Object.values(grades);
    if (values.length === 0) return null;
    const avg = values.reduce((sum, g) => sum + g, 0) / values.length;
    return roundToHalfOrWhole(avg);
  };

  const calculateRequiredSemesterGrade = (subject, targetSemesterAvg) => {
    const currentGrades = subjects[subject] || [];
    if (currentGrades.length === 0) return null;
    
    const currentTotalWeight = currentGrades.reduce((sum, g) => sum + g.weight, 0);
    const remainingWeight = 1;
    const totalWeight = currentTotalWeight + remainingWeight;
    
    const currentSum = currentGrades.reduce((sum, g) => sum + (g.grade * g.weight), 0);
    const required = (targetSemesterAvg * totalWeight - currentSum) / remainingWeight;
    
    return Math.round(required * 10) / 10;
  };

  const simulateSemesterAverage = (subject) => {
    const currentGrades = subjects[subject] || [];
    const planned = (semesterPlans[subject] || []).map(p => ({ grade: parseFloat(p.grade), weight: parseFloat(p.weight) }));
    const allGrades = [...currentGrades, ...planned];
    if (allGrades.length === 0) return null;
    const avg = calculateWeightedAverage(allGrades);
    return avg ? roundToHalfOrWhole(avg) : null;
  };

  const addPlannedControl = (subject, grade, weight) => {
    const plan = { id: Date.now(), grade: parseFloat(grade), weight: parseFloat(weight) };
    setSemesterPlans(prev => ({
      ...prev,
      [subject]: [...(prev[subject] || []), plan]
    }));
  };

  const removePlannedControl = (subject, id) => {
    setSemesterPlans(prev => ({
      ...prev,
      [subject]: (prev[subject] || []).filter(p => p.id !== id)
    }));
  };

  const calculateRequiredSemesterGradeWithPlans = (subject, targetSemesterAvg, assumedWeight = 1) => {
    const baseGrades = subjects[subject] || [];
    const planned = (semesterPlans[subject] || []).map(p => ({ grade: parseFloat(p.grade), weight: parseFloat(p.weight) }));
    const all = [...baseGrades, ...planned];
    if (all.length === 0) return null;
    const currentTotalWeight = all.reduce((sum, g) => sum + g.weight, 0);
    const currentSum = all.reduce((sum, g) => sum + (g.grade * g.weight), 0);
    const required = (targetSemesterAvg * (currentTotalWeight + assumedWeight) - currentSum) / assumedWeight;
    return Math.round(required * 10) / 10;
  };

  const getSubjectsForSemester = (semester) => {
    const allSubjects = [...BM_SUBJECTS[bmType].grundlagen, ...BM_SUBJECTS[bmType].schwerpunkt, ...BM_SUBJECTS[bmType].erganzung, ...BM_SUBJECTS[bmType].interdisziplinar];
    return allSubjects.filter(subject => {
      const semesters = LEKTIONENTAFEL[bmType][subject];
      return semesters && semesters.includes(semester);
    });
  };

  const calculateOverallSimulatedSemesterAverage = () => {
    const subjectsInSemester = getSubjectsForSemester(currentSemester);
    const avgs = subjectsInSemester.map(subject => simulateSemesterAverage(subject)).filter(a => a !== null);
    if (avgs.length === 0) return null;
    const total = avgs.reduce((sum, a) => sum + a, 0);
    return roundToHalfOrWhole(total / avgs.length);
  };

  const calculateSemesterPromotionStatus = () => {
    const subjectsInSemester = getSubjectsForSemester(currentSemester);
    // Exclure IDAF (Interdisziplinäres Arbeiten) du calcul de promotion
    const promotionSubjects = subjectsInSemester.filter(s => s !== 'Interdisziplinäres Arbeiten');
    const avgs = promotionSubjects.map(subject => simulateSemesterAverage(subject)).filter(a => a !== null);
    
    if (avgs.length === 0) return null;
    
    // Moyenne arrondie au dixième (pas au demi-point)
    const overallAvgRaw = avgs.reduce((sum, a) => sum + a, 0) / avgs.length;
    const overallAvg = Math.round(overallAvgRaw * 10) / 10;
    
    const failingGrades = avgs.filter(a => a < 4.0);
    const failingCount = failingGrades.length;
    const deficit = failingGrades.reduce((sum, grade) => sum + (4.0 - grade), 0);
    
    const condition1 = overallAvg >= 4.0;
    const condition2 = deficit <= 2.0;
    const condition3 = failingCount <= 2;
    
    const isPromoted = condition1 && condition2 && condition3;
    
    return {
      overallAvg,
      failingCount,
      deficit: Math.round(deficit * 10) / 10,
      condition1,
      condition2,
      condition3,
      isPromoted
    };
  };

  const calculateRequiredExamGrade = (subject, targetMaturnote) => {
    const erfahrungsnote = calculateErfahrungsnote(subject);
    if (!erfahrungsnote) return null;
    const required = 2 * targetMaturnote - erfahrungsnote;
    return Math.round(required * 10) / 10;
  };

  const calculateMaturnote = (subject, examGrade) => {
    const erfahrungsnote = calculateErfahrungsnote(subject);
    if (!erfahrungsnote || !examGrade) return null;
    const maturnote = (erfahrungsnote + parseFloat(examGrade)) / 2;
    return roundToHalfOrWhole(maturnote);
  };

  const calculateOverallAverage = () => {
    const allSubjects = [...BM_SUBJECTS[bmType].grundlagen, ...BM_SUBJECTS[bmType].schwerpunkt, ...BM_SUBJECTS[bmType].erganzung, ...BM_SUBJECTS[bmType].interdisziplinar];
    const maturnotes = allSubjects.map(subject => {
      const exam = examSimulator[subject];
      if (EXAM_SUBJECTS[bmType].includes(subject)) {
        return calculateMaturnote(subject, exam);
      } else {
        return calculateErfahrungsnote(subject);
      }
    }).filter(n => n !== null);
    
    if (maturnotes.length === 0) return null;
    const avg = maturnotes.reduce((sum, n) => sum + n, 0) / maturnotes.length;
    return Math.round(avg * 10) / 10;
  };

  // Simulated helpers: per-subject views
  const getSimulatedSemesterAverage = (subject) => {
    const sim = semesterSimulator[subject];
    if (sim?.grade && sim?.weight) {
      return simulateSemesterAverage(subject, sim.grade, sim.weight);
    }
    return calculateSemesterAverage(subject);
  };

  const getSimulatedMaturnote = (subject) => {
    const simExam = examSimulator[subject];
    if (simExam) {
      return calculateMaturnote(subject, simExam);
    }
    return null;
  };

  const checkPassingConditions = () => {
    const allSubjects = [...BM_SUBJECTS[bmType].grundlagen, ...BM_SUBJECTS[bmType].schwerpunkt, ...BM_SUBJECTS[bmType].erganzung, ...BM_SUBJECTS[bmType].interdisziplinar];
    const maturnotes = allSubjects.map(subject => {
      const exam = examSimulator[subject];
      if (EXAM_SUBJECTS[bmType].includes(subject)) {
        return calculateMaturnote(subject, exam);
      } else {
        return calculateErfahrungsnote(subject);
      }
    }).filter(n => n !== null);

    if (maturnotes.length < 9) return null;

    const overallAvg = calculateOverallAverage();
    const failingGrades = maturnotes.filter(n => n < 4);
    const deficit = failingGrades.reduce((sum, n) => sum + (4 - n), 0);

    return {
      condition1: overallAvg >= 4.0,
      condition2: deficit <= 2,
      condition3: failingGrades.length <= 2,
      overallAvg,
      deficit,
      failingCount: failingGrades.length
    };
  };

  const toggleSubject = (subject) => {
    setExpandedSubjects({
      ...expandedSubjects,
      [subject]: !expandedSubjects[subject]
    });
  };

  const getChartData = () => {
    const allSubjects = [...BM_SUBJECTS[bmType].grundlagen, ...BM_SUBJECTS[bmType].schwerpunkt, ...BM_SUBJECTS[bmType].erganzung, ...BM_SUBJECTS[bmType].interdisziplinar];
    
    return allSubjects.map(subject => {
      const erfahrungsnote = calculateErfahrungsnote(subject);
      const exam = examSimulator[subject];
      const maturnote = EXAM_SUBJECTS[bmType].includes(subject) 
        ? calculateMaturnote(subject, exam)
        : erfahrungsnote;

      return {
        name: subject.length > 15 ? subject.substring(0, 15) + '...' : subject,
        fullName: subject,
        Erfahrungsnote: erfahrungsnote || 0,
        Maturnote: maturnote || 0
      };
    }).filter(d => d.Erfahrungsnote > 0 || d.Maturnote > 0);
  };

  const getSubjectProgressData = () => {
    const allSubjects = [...BM_SUBJECTS[bmType].grundlagen, ...BM_SUBJECTS[bmType].schwerpunkt, ...BM_SUBJECTS[bmType].erganzung, ...BM_SUBJECTS[bmType].interdisziplinar];
    const maxSemester = Math.max(...Object.values(semesterGrades).flatMap(s => Object.keys(s).map(Number)), 0);
    
    if (maxSemester === 0) return [];
    
    const data = [];
    for (let sem = 1; sem <= maxSemester; sem++) {
      const semesterData = { semester: `S${sem}` };
      
      allSubjects.forEach(subject => {
        const grade = semesterGrades[subject]?.[sem];
        if (grade) {
          const shortName = subject.length > 20 ? subject.substring(0, 18) + '...' : subject;
          semesterData[shortName] = grade;
        }
      });
      
      data.push(semesterData);
    }
    
    return data;
  };

  const allSubjects = [...BM_SUBJECTS[bmType].grundlagen, ...BM_SUBJECTS[bmType].schwerpunkt, ...BM_SUBJECTS[bmType].erganzung, ...BM_SUBJECTS[bmType].interdisziplinar];
  const passingConditions = checkPassingConditions();

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto p-4">
        <header className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h1 className="text-3xl font-bold text-indigo-900 mb-4 flex items-center gap-3">
            <Book className="w-8 h-8" />
            Calculateur de Notes BM
          </h1>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type de BM</label>
              <select 
                value={bmType} 
                onChange={(e) => setBmType(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="TAL">TAL - Technique, Architecture, Life Sciences</option>
                <option value="DL">DL - Dienstleistung</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Semestre actuel</label>
              <input 
                type="number" 
                min="1" 
                max="8"
                value={currentSemester}
                onChange={(e) => setCurrentSemester(parseInt(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </header>

        {(activeTab === 'current' || activeTab === 'previous') && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <h2 className="text-xl font-bold text-indigo-900 mb-4 flex items-center gap-2">
              <Camera className="w-6 h-6" />
              {activeTab === 'current' ? 'Scanner SAL' : 'Scanner un Bulletin'}
            </h2>
            
            <div className="flex flex-col items-center gap-4">
              <label className="w-full cursor-pointer">
                <div className="border-2 border-dashed border-indigo-300 rounded-xl p-8 text-center hover:border-indigo-500 hover:bg-indigo-50 transition">
                  <Upload className="w-12 h-12 mx-auto mb-3 text-indigo-600" />
                  {activeTab === 'current' ? (
                    <>
                      <p className="text-gray-700 font-medium mb-1">Cliquez pour télécharger un screenshot SAL</p>
                      <p className="text-sm text-gray-500">Image uniquement (JPG, PNG)</p>
                    </>
                  ) : (
                    <>
                      <p className="text-gray-700 font-medium mb-1">Cliquez pour télécharger un bulletin</p>
                      <p className="text-sm text-gray-500">Image (JPG, PNG) ou PDF</p>
                    </>
                  )}
                </div>
                <input
                  type="file"
                  accept={activeTab === 'current' ? 'image/*' : 'image/*,application/pdf'}
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {isAnalyzing && (
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  <p className="mt-2 text-gray-600">Analyse en cours...</p>
                </div>
              )}

              {analysisResult && !isAnalyzing && (
                <div className={`w-full p-4 rounded-lg ${analysisResult.error ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                  {analysisResult.error ? (
                    <p className="text-red-800">❌ {analysisResult.error}</p>
                  ) : (
                    <div>
                      <p className="text-green-800 font-bold mb-2">
                        ✓ {analysisResult.message || `${(lastScanType || 'Bulletin')} analysé - Semestre ${analysisResult.semester}`}
                      </p>
                      {analysisResult.grades && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                          {Object.entries(analysisResult.grades).map(([subject, grade]) => (
                            <div key={subject} className="bg-white p-2 rounded">
                              <span className="text-gray-700">{subject}:</span>
                              <span className="font-bold ml-1">{grade}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {analysisResult.controls && (
                        <div className="space-y-2 text-sm">
                          {analysisResult.controls.map((control, idx) => (
                            <div key={idx} className="bg-white p-2 rounded">
                              <span className="text-gray-700">{control.subject}:</span>
                              <span className="font-bold ml-1">{control.grade}</span>
                              <span className="text-gray-500 text-xs ml-2">
                                ({new Date(control.date).toLocaleDateString('fr-CH')})
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-2 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('current')}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${activeTab === 'current' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
          >
            Semestre Actuel
          </button>
          <button
            onClick={() => setActiveTab('semester-sim')}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${activeTab === 'semester-sim' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
          >
            <Target className="w-4 h-4 inline mr-2" />
            Simulation Semestre
          </button>
          <button
            onClick={() => setActiveTab('previous')}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${activeTab === 'previous' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
          >
            Bulletins Précédents
          </button>
          <button
            onClick={() => setActiveTab('exam')}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${activeTab === 'exam' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
          >
            Simulation Examens
          </button>
          <button
            onClick={() => setActiveTab('charts')}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${activeTab === 'charts' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
          >
            <BarChart className="w-4 h-4 inline mr-2" />
            Graphiques
          </button>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {activeTab === 'semester-sim' && (
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h2 className="text-xl font-bold text-indigo-900 mb-4 flex items-center gap-2">
                  <Target className="w-6 h-6" />
                  Simulateur de Semestre
                </h2>
                
                {/* Statut de promotion semestrielle en haut */}
                {calculateSemesterPromotionStatus() && (
                  <div className="mb-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-indigo-900">État de Promotion Semestrielle (BM1) - Semestre {currentSemester}</h3>
                      <div className={`px-4 py-2 rounded-lg font-bold text-sm ${
                        calculateSemesterPromotionStatus().isPromoted 
                          ? 'bg-green-200 text-green-900' 
                          : 'bg-red-200 text-red-900'
                      }`}>
                        {calculateSemesterPromotionStatus().isPromoted ? '✅ Promu(e)' : '❌ Non promu(e)'}
                      </div>
                    </div>
                    
                    <div className="grid md:grid-cols-3 gap-4">
                      {/* Notes insuffisantes */}
                      <div className={`p-4 rounded-xl ${calculateSemesterPromotionStatus().failingCount <= 2 ? 'bg-green-100' : 'bg-red-100'}`}>
                        <div className="text-sm text-gray-700 mb-1">Notes insuffisantes (&lt; 4.0)</div>
                        <div className={`text-3xl font-bold ${calculateSemesterPromotionStatus().failingCount <= 2 ? 'text-green-800' : 'text-red-800'}`}>
                          {calculateSemesterPromotionStatus().failingCount}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">Max: 2</div>
                      </div>

                      {/* Somme des écarts */}
                      <div className={`p-4 rounded-xl ${calculateSemesterPromotionStatus().deficit <= 2.0 ? 'bg-green-100' : 'bg-red-100'}`}>
                        <div className="text-sm text-gray-700 mb-1">Somme des écarts</div>
                        <div className={`text-3xl font-bold ${calculateSemesterPromotionStatus().deficit <= 2.0 ? 'text-green-800' : 'text-red-800'}`}>
                          {calculateSemesterPromotionStatus().deficit.toFixed(1)}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">Max: 2.0</div>
                      </div>

                      {/* Moyenne générale */}
                      <div className={`p-4 rounded-xl ${calculateSemesterPromotionStatus().overallAvg >= 4.0 ? 'bg-green-100' : 'bg-red-100'}`}>
                        <div className="text-sm text-gray-700 mb-1">Moyenne générale (sans IDAF)</div>
                        <div className={`text-3xl font-bold ${calculateSemesterPromotionStatus().overallAvg >= 4.0 ? 'text-green-800' : 'text-red-800'}`}>
                          {calculateSemesterPromotionStatus().overallAvg.toFixed(1)}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">Min: 4.0</div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Objectif par défaut pour les matières
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="6"
                    value={semesterGoal}
                    onChange={(e) => setSemesterGoal(parseFloat(e.target.value))}
                    className="w-full p-3 border-2 border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-lg font-bold"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  {getSubjectsForSemester(currentSemester).map(subject => {
                    const subjectGoal = subjectGoals[subject] ?? semesterGoal;
                    return (
                      <SemesterSimulatorCard
                        key={subject}
                        subject={subject}
                        currentGrades={subjects[subject] || []}
                        plannedControls={semesterPlans[subject] || []}
                        onAddPlan={(grade, weight) => addPlannedControl(subject, grade, weight)}
                        onRemovePlan={(id) => removePlannedControl(subject, id)}
                        currentAverage={calculateSemesterAverage(subject)}
                        simulatedAverage={simulateSemesterAverage(subject)}
                        goalGrade={subjectGoal}
                        onGoalChange={(goal) => setSubjectGoals(prev => ({ ...prev, [subject]: goal }))}
                        computeRequired={(assumedWeight) => calculateRequiredSemesterGradeWithPlans(subject, subjectGoal, assumedWeight)}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'current' && (
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h2 className="text-xl font-bold text-indigo-900 mb-4 flex items-center gap-2">
                  <Calculator className="w-6 h-6" />
                  Notes du Semestre {currentSemester}
                </h2>
                
                <div className="grid md:grid-cols-2 gap-4 items-start">
                  {getSubjectsForSemester(currentSemester).map(subject => (
                    <SubjectCard
                      key={subject}
                      subject={subject}
                      grades={subjects[subject] || []}
                      onAddGrade={addGrade}
                      onRemoveGrade={removeGrade}
                      semesterAverage={calculateSemesterAverage(subject)}
                      expanded={expandedSubjects[subject]}
                      onToggle={toggleSubject}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'previous' && (
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h2 className="text-xl font-bold text-indigo-900 mb-4 flex items-center gap-2">
                  <Save className="w-6 h-6" />
                  Notes des Bulletins Précédents
                </h2>
                
                <div className="grid md:grid-cols-2 gap-4">
                  {getSubjectsForSemester(currentSemester).map(subject => (
                    <PreviousSemestersCard
                      key={subject}
                      subject={subject}
                      semesterGrades={semesterGrades[subject] || {}}
                      currentSemester={currentSemester}
                      onAddSemesterGrade={addSemesterGrade}
                      erfahrungsnote={calculateErfahrungsnote(subject)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'exam' && (
            <>
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h2 className="text-xl font-bold text-indigo-900 mb-4 flex items-center gap-2">
                  <Target className="w-6 h-6" />
                  Simulateur d'Examen Final
                </h2>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Note objectif pour la Maturnote
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="6"
                    value={goalGrade}
                    onChange={(e) => setGoalGrade(parseFloat(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {EXAM_SUBJECTS[bmType].map(subject => (
                  <ExamSimulatorCard
                    key={subject}
                    subject={subject}
                    erfahrungsnote={calculateErfahrungsnote(subject)}
                    examGrade={examSimulator[subject]}
                    onExamGradeChange={(grade) => setExamSimulator({...examSimulator, [subject]: grade})}
                    requiredGrade={calculateRequiredExamGrade(subject, goalGrade)}
                    maturnote={calculateMaturnote(subject, examSimulator[subject])}
                    goalGrade={goalGrade}
                  />
                ))}
              </div>

              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h2 className="text-xl font-bold text-indigo-900 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-6 h-6" />
                  Résultats Finaux
                </h2>
                
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4">
                    <div className="text-sm text-gray-600 mb-1">Moyenne Générale</div>
                    <div className="text-4xl font-bold text-indigo-900">
                      {calculateOverallAverage()?.toFixed(1) || '-'}
                    </div>
                  </div>

                  {passingConditions && (
                    <div className="space-y-2">
                      <h3 className="font-semibold text-gray-800">Conditions de Réussite</h3>
                      
                      <div className={`p-3 rounded-lg ${passingConditions.condition1 ? 'bg-green-50' : 'bg-red-50'}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Moyenne ≥ 4.0</span>
                          <span className={`font-bold ${passingConditions.condition1 ? 'text-green-700' : 'text-red-700'}`}>
                            {passingConditions.condition1 ? '✓' : '✗'} {passingConditions.overallAvg.toFixed(1)}
                          </span>
                        </div>
                      </div>

                      <div className={`p-3 rounded-lg ${passingConditions.condition2 ? 'bg-green-50' : 'bg-red-50'}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Déficit ≤ 2.0</span>
                          <span className={`font-bold ${passingConditions.condition2 ? 'text-green-700' : 'text-red-700'}`}>
                            {passingConditions.condition2 ? '✓' : '✗'} {passingConditions.deficit.toFixed(1)}
                          </span>
                        </div>
                      </div>

                      <div className={`p-3 rounded-lg ${passingConditions.condition3 ? 'bg-green-50' : 'bg-red-50'}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Notes &lt; 4: ≤ 2</span>
                          <span className={`font-bold ${passingConditions.condition3 ? 'text-green-700' : 'text-red-700'}`}>
                            {passingConditions.condition3 ? '✓' : '✗'} {passingConditions.failingCount}
                          </span>
                        </div>
                      </div>

                      <div className={`mt-4 p-4 rounded-xl text-center font-bold text-lg ${
                        passingConditions.condition1 && passingConditions.condition2 && passingConditions.condition3 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {passingConditions.condition1 && passingConditions.condition2 && passingConditions.condition3 
                          ? '🎉 Réussi!' 
                          : '❌ Non réussi'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {activeTab === 'charts' && (
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h2 className="text-xl font-bold text-indigo-900 mb-4">Évolution des Notes par Matière</h2>
                {getSubjectProgressData().length > 0 ? (
                  <ResponsiveContainer width="100%" height={500}>
                    <LineChart data={getSubjectProgressData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="semester" />
                      <YAxis domain={[1, 6]} />
                      <Tooltip formatter={(value) => value.toFixed(1)} />
                      <Legend />
                      {Object.keys(getSubjectProgressData()[0] || {})
                        .filter(key => key !== 'semester')
                        .map((subject, index) => {
                          const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#6366f1', '#14b8a6', '#f97316'];
                          return (
                            <Line 
                              key={subject}
                              type="monotone" 
                              dataKey={subject} 
                              stroke={colors[index % colors.length]} 
                              strokeWidth={2} 
                              dot={{ r: 4 }}
                              connectNulls
                            />
                          );
                        })}
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    Aucune donnée disponible. Ajoutez des notes de bulletins précédents pour voir l'évolution.
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h2 className="text-xl font-bold text-indigo-900 mb-4">Moyenne Générale par Semestre</h2>
                {(() => {
                  const avgData = [];
                  const maxSem = Math.max(...Object.values(semesterGrades).flatMap(s => Object.keys(s).map(Number)), 0);
                  const allSubs = [...BM_SUBJECTS[bmType].grundlagen, ...BM_SUBJECTS[bmType].schwerpunkt, ...BM_SUBJECTS[bmType].erganzung, ...BM_SUBJECTS[bmType].interdisziplinar];
                  
                  for (let sem = 1; sem <= maxSem; sem++) {
                    let total = 0, count = 0;
                    allSubs.forEach(sub => {
                      const grade = semesterGrades[sub]?.[sem];
                      if (grade) { total += grade; count++; }
                    });
                    if (count > 0) {
                      avgData.push({ semester: `S${sem}`, moyenne: Math.round((total / count) * 10) / 10 });
                    }
                  }
                  
                  return avgData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={avgData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="semester" />
                        <YAxis domain={[1, 6]} />
                        <Tooltip formatter={(value) => value.toFixed(1)} />
                        <Legend />
                        <Line type="monotone" dataKey="moyenne" stroke="#3b82f6" strokeWidth={3} dot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      Aucune donnée disponible.
                    </div>
                  );
                })()}
              </div>

              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h2 className="text-xl font-bold text-indigo-900 mb-4">Statistiques</h2>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
                    <div className="text-sm text-gray-600 mb-1">Meilleure Note</div>
                    <div className="text-3xl font-bold text-blue-900">
                      {getChartData().length > 0 ? Math.max(...getChartData().map(d => d.Maturnote || d.Erfahrungsnote)).toFixed(1) : '-'}
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4">
                    <div className="text-sm text-gray-600 mb-1">Note la plus basse</div>
                    <div className="text-3xl font-bold text-green-900">
                      {getChartData().length > 0 ? Math.min(...getChartData().filter(d => (d.Maturnote || d.Erfahrungsnote) > 0).map(d => d.Maturnote || d.Erfahrungsnote)).toFixed(1) : '-'}
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4">
                    <div className="text-sm text-gray-600 mb-1">Écart-type</div>
                    <div className="text-3xl font-bold text-purple-900">
                      {(() => {
                        const data = getChartData().map(d => d.Maturnote || d.Erfahrungsnote).filter(n => n > 0);
                        if (data.length === 0) return '-';
                        const mean = data.reduce((a, b) => a + b, 0) / data.length;
                        const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
                        return Math.sqrt(variance).toFixed(2);
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SubjectCard({ subject, grades, onAddGrade, onRemoveGrade, semesterAverage, expanded, onToggle }) {
  const [newGrade, setNewGrade] = useState('');
  const [newWeight, setNewWeight] = useState('1');

  const handleAdd = () => {
    if (newGrade && newWeight) {
      onAddGrade(subject, newGrade, newWeight);
      setNewGrade('');
      setNewWeight('1');
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => onToggle(subject)}
        className="w-full p-3 bg-gradient-to-r from-indigo-50 to-purple-50 flex items-center justify-between hover:from-indigo-100 hover:to-purple-100 transition"
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-800 text-sm">{subject}</span>
          {semesterAverage && (
            <span className="text-xs px-2 py-1 bg-indigo-600 text-white rounded-full">
              ⌀ {semesterAverage.toFixed(1)}
            </span>
          )}
        </div>
        {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
      </button>

      {expanded && (
        <div className="p-3 bg-gray-50">
          <div className="space-y-2 mb-3">
            {grades.map(g => (
              <div key={g.id} className="flex items-center justify-between bg-white p-2 rounded">
                <div className="flex flex-col">
                  <span className="text-sm">
                    Note: <strong>{g.grade.toFixed(1)}</strong> × {g.displayWeight || g.weight}
                  </span>
                  {g.date && (
                    <span className="text-xs text-gray-500">
                      {new Date(g.date).toLocaleDateString('fr-CH')}
                      {g.name && ` - ${g.name}`}
                    </span>
                  )}
                </div>
                <button onClick={() => onRemoveGrade(subject, g.id)} className="text-red-500 hover:text-red-700">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="number"
              step="0.5"
              min="1"
              max="6"
              placeholder="Note"
              value={newGrade}
              onChange={(e) => setNewGrade(e.target.value)}
              className="flex-1 p-2 border border-gray-300 rounded text-sm"
            />
            <input
              type="text"
              placeholder="Pond. (ex: 1/2, 50%, 0.5)"
              value={newWeight}
              onChange={(e) => setNewWeight(e.target.value)}
              className="w-32 p-2 border border-gray-300 rounded text-sm"
            />
            <button onClick={handleAdd} className="p-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PreviousSemestersCard({ subject, semesterGrades, currentSemester, onAddSemesterGrade, erfahrungsnote }) {
  const [selectedSemester, setSelectedSemester] = useState('');
  const [grade, setGrade] = useState('');

  const handleAdd = () => {
    if (selectedSemester && grade) {
      onAddSemesterGrade(subject, selectedSemester, grade);
      setSelectedSemester('');
      setGrade('');
    }
  };

  const hasGrades = Object.keys(semesterGrades).length > 0;

  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-gradient-to-r from-green-50 to-teal-50">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-gray-800 text-sm">{subject}</span>
        {erfahrungsnote && (
          <span className="text-xs px-2 py-1 bg-green-600 text-white rounded-full">
            Erfahr. {erfahrungsnote.toFixed(1)}
          </span>
        )}
      </div>

      {hasGrades && (
        <div className="space-y-1 mb-2">
          {Object.entries(semesterGrades).sort((a, b) => Number(a[0]) - Number(b[0])).map(([sem, g]) => (
            <div key={sem} className="text-xs text-gray-600 bg-white p-1 rounded">
              Sem. {sem}: <strong>{g.toFixed(1)}</strong>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <select
          value={selectedSemester}
          onChange={(e) => setSelectedSemester(e.target.value)}
          className="flex-1 p-2 border border-gray-300 rounded text-sm"
        >
          <option value="">Sem.</option>
          {Array.from({length: Math.max(currentSemester - 1, 8)}, (_, i) => i + 1).map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <input
          type="number"
          step="0.5"
          min="1"
          max="6"
          placeholder="Note"
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
          className="w-20 p-2 border border-gray-300 rounded text-sm"
        />
        <button onClick={handleAdd} className="p-2 bg-green-600 text-white rounded hover:bg-green-700">
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function ExamSimulatorCard({ subject, erfahrungsnote, examGrade, onExamGradeChange, requiredGrade, maturnote, goalGrade }) {
  return (
    <div className="mb-4 border-2 border-indigo-200 rounded-lg p-4 bg-gradient-to-r from-indigo-50 to-purple-50">
      <h3 className="font-semibold text-gray-800 mb-2">{subject}</h3>
      
      <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
        <div>
          <div className="text-gray-600">Erfahrungsnote</div>
          <div className="font-bold text-lg">{erfahrungsnote?.toFixed(1) || '-'}</div>
        </div>
        <div>
          <div className="text-gray-600">Note requise</div>
          <div className={`font-bold text-lg ${requiredGrade && (requiredGrade < 1 || requiredGrade > 6) ? 'text-orange-600' : ''}`}>
            {requiredGrade?.toFixed(1) || '-'}
          </div>
        </div>
      </div>

      <label className="block text-sm text-gray-700 mb-1">Note d'examen simulée</label>
      <input
        type="number"
        step="0.5"
        min="1"
        max="6"
        value={examGrade || ''}
        onChange={(e) => onExamGradeChange(e.target.value)}
        placeholder="Saisir note"
        className="w-full p-2 border border-gray-300 rounded-lg mb-2"
      />

      {maturnote && (
        <div className={`text-center p-3 rounded-lg font-bold text-lg ${
          maturnote >= goalGrade ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
        }`}>
          Maturnote: {maturnote.toFixed(1)}
        </div>
      )}
    </div>
  );
}

function SemesterSimulatorCard({ subject, currentGrades, plannedControls, onAddPlan, onRemovePlan, currentAverage, simulatedAverage, goalGrade, onGoalChange, computeRequired }) {
  const [grade, setGrade] = useState('');
  const [weight, setWeight] = useState('1');
  const [assumedWeight, setAssumedWeight] = useState('1');

  const parseWeight = (w) => {
    if (typeof w !== 'string') return parseFloat(w);
    if (w.includes('/')) {
      const [num, den] = w.split('/').map(n => parseFloat(n.trim()));
      return num / den;
    }
    if (w.includes('%')) {
      return parseFloat(w.replace('%', '').trim()) / 100;
    }
    return parseFloat(w);
  };

  const handleAdd = () => {
    if (!grade || !weight) return;
    const pw = parseWeight(weight);
    if (!isNaN(pw)) {
      onAddPlan(parseFloat(grade), pw);
      setGrade('');
      setWeight('1');
    }
  };

  const totalCurrentWeight = currentGrades.reduce((sum, g) => sum + g.weight, 0);
  const totalPlannedWeight = (plannedControls || []).reduce((sum, p) => sum + parseFloat(p.weight), 0);
  const requiredWithPlans = computeRequired(parseWeight(assumedWeight));

  return (
    <div className="border-2 border-blue-200 rounded-lg p-4 bg-gradient-to-r from-blue-50 to-cyan-50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-800 text-sm">{subject}</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600">Objectif:</span>
          <input
            type="number"
            step="0.5"
            min="1"
            max="6"
            value={goalGrade}
            onChange={(e) => onGoalChange(parseFloat(e.target.value))}
            className="w-16 p-1 border border-indigo-300 rounded text-sm font-bold text-center"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
        <div>
          <div className="text-gray-600">Moyenne actuelle</div>
          <div className="font-bold text-lg text-blue-900">{currentAverage?.toFixed(1) || '-'}</div>
          <div className="text-gray-500 text-xs">({currentGrades.length} notes, Σ pond: {totalCurrentWeight.toFixed(1)})</div>
        </div>
        <div>
          <div className="text-gray-600">Note requise (pond. suivante)</div>
          <div className={`font-bold text-lg ${
            requiredWithPlans && (requiredWithPlans < 1 || requiredWithPlans > 6)
              ? 'text-orange-600'
              : requiredWithPlans && requiredWithPlans <= 4
                ? 'text-green-600'
                : 'text-blue-900'
          }`}>
            {requiredWithPlans?.toFixed(1) || '-'}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-gray-500 text-xs">pond:</span>
            <input
              type="text"
              value={assumedWeight}
              onChange={(e) => setAssumedWeight(e.target.value)}
              className="w-20 p-1 border border-gray-300 rounded text-xs"
            />
          </div>
        </div>
      </div>

      {requiredWithPlans && (requiredWithPlans < 1 || requiredWithPlans > 6) && (
        <div className="mb-3 p-2 bg-orange-100 rounded text-xs text-orange-800">
          ⚠️ Objectif {requiredWithPlans < 1 ? 'déjà atteint' : 'impossible à atteindre'}
        </div>
      )}

      <div className="border-t border-blue-200 pt-3 mt-3">
        <label className="block text-xs text-gray-700 mb-2 font-semibold">Ajouter des contrôles planifiés</label>
        <div className="flex gap-2 mb-2">
          <input type="number" step="0.5" min="1" max="6" placeholder="Note" value={grade} onChange={(e) => setGrade(e.target.value)} className="flex-1 p-2 border border-gray-300 rounded text-sm" />
          <input type="text" placeholder="Pond." value={weight} onChange={(e) => setWeight(e.target.value)} className="w-24 p-2 border border-gray-300 rounded text-sm" />
          <button onClick={handleAdd} className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {plannedControls?.length > 0 && (
          <div className="mb-3">
            <div className="text-xs text-gray-600 mb-1">Contrôles planifiés (Σ pond: {totalPlannedWeight.toFixed(1)})</div>
            <ul className="space-y-1">
              {plannedControls.map(p => (
                <li key={p.id} className="flex items-center justify-between text-xs bg-white rounded p-2 border">
                  <span>Note {p.grade.toFixed(1)} × {p.weight}</span>
                  <button onClick={() => onRemovePlan(p.id)} className="text-red-600 hover:text-red-800"><Trash2 className="w-4 h-4" /></button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {simulatedAverage && (
          <div className={`text-center p-3 rounded-lg font-bold ${simulatedAverage >= goalGrade ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
            Moyenne simulée: {simulatedAverage.toFixed(1)}
          </div>
        )}
      </div>
    </div>
  );
}