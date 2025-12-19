import React, { useState, useEffect } from 'react';
import { Book, Calculator, TrendingUp, Target } from 'lucide-react';
import { BM_SUBJECTS, EXAM_SUBJECTS, LEKTIONENTAFEL } from './constants';
import { GradeCard, SemesterSimulatorCard, BulletinAnalysis, PromotionStatus } from './components';
import { useLoadData, useSaveData, useGradeCalculations, useBulletinAnalysis } from './hooks';
import { useDatabase } from './hooks/useDatabase';
import CognitoAuthPanel from './components/CognitoAuthPanel';
import SemesterPrompt from './components/SemesterPrompt';
import { storage, formatSwissDate } from './utils';
import { useAuth as useCognitoAuth } from 'react-oidc-context';

const AuthBackdrop = ({ children, contentClassName = 'w-full max-w-xl' }) => (
  <div className="relative min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-[#eef2ff] via-[#fdfbff] to-[#e5e4ff] overflow-x-hidden">
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute -top-12 -right-6 h-64 w-64 rounded-full bg-indigo-200/50 blur-3xl" />
      <div className="absolute -bottom-16 -left-10 h-72 w-72 rounded-full bg-purple-200/40 blur-3xl" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/20 to-transparent" />
    </div>
    <div className={`relative z-10 ${contentClassName}`}>
      {children}
    </div>
  </div>
);

const LoadingState = () => (
  <div className="flex flex-col items-center gap-4 rounded-3xl bg-white/80 px-8 py-10 shadow-2xl backdrop-blur">
    <div className="h-14 w-14 rounded-full border-4 border-indigo-100 border-t-indigo-500 animate-spin" aria-label="Loading" />
    <div className="text-center">
      <p className="text-lg font-semibold text-gray-900">Securing your session…</p>
      <p className="text-sm text-gray-500">This will only take a moment</p>
    </div>
    <div className="flex items-center gap-2">
      {[0, 150, 300].map(delay => (
        <span
          key={delay}
          className="h-2.5 w-2.5 rounded-full bg-indigo-500 animate-bounce"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  </div>
);

export default function BMGradeCalculator() {
  // Cognito authentication
  const auth = useCognitoAuth();
  
  // Map Cognito auth to expected format
  const user = auth.isAuthenticated ? auth.user : null;
  const authLoading = auth.isLoading;
  
  // ============ Application state ============
  const [bmType, setBmType] = useState('TAL');
  const [currentSemester, setCurrentSemester] = useState(1);
  const [subjects, setSubjects] = useState({});
  const [semesterGrades, setSemesterGrades] = useState({});
  const [examSimulator, setExamSimulator] = useState({});
  const [semesterPlans, setSemesterPlans] = useState({});
  const [subjectGoals, setSubjectGoals] = useState({});
  const [maturnoteGoal, setMaturnoteGoal] = useState(5.0);
  const [activeTab, setActiveTab] = useState('current');
  const [showSemesterPrompt, setShowSemesterPrompt] = useState(false);

  // ============ Custom hooks ============
  const validSubjects = new Set(Object.keys(LEKTIONENTAFEL[bmType] || {}));
  
  // Database hook
  const database = useDatabase();
  const [dataLoaded, setDataLoaded] = useState(false);

  // Load data from database on login
  useEffect(() => {
    const loadFromDatabase = async () => {
      console.log('🔍 loadFromDatabase called', { user: !!user, dataLoaded, loading: database.loading, userId: database.userId });
      if (!user || dataLoaded || database.loading) return;
      
      try {
        // Sync user first
        console.log('🔄 Syncing user...');
        const userData = await database.syncUser(bmType);
        console.log('✅ User synced:', userData);
        if (userData) {
          setBmType(userData.bm_type || 'TAL');
          setCurrentSemester(userData.current_semester || 1);
          setMaturnoteGoal(parseFloat(userData.maturanote_goal) || 5.0);
        }

        // Load grades and convert to subjects format
        console.log('📚 Loading grades...');
        const grades = await database.getUserGrades();
        console.log('📚 Grades loaded:', grades);
        if (grades && grades.length > 0) {
          const subjectsFromDb = {};
          grades.forEach(g => {
            if (!subjectsFromDb[g.subject_name]) {
              subjectsFromDb[g.subject_name] = [];
            }
            subjectsFromDb[g.subject_name].push({
              id: g.id,
              grade: parseFloat(g.grade),
              weight: parseFloat(g.weight),
              displayWeight: g.weight.toString(),
              date: formatSwissDate(g.control_date),
              name: g.control_name
            });
          });
          setSubjects(subjectsFromDb);
        }

        // Load semester grades
        const semGrades = await database.getUserSemesterGrades();
        if (semGrades && semGrades.length > 0) {
          const semGradesFromDb = {};
          semGrades.forEach(g => {
            if (!semGradesFromDb[g.subject_name]) {
              semGradesFromDb[g.subject_name] = {};
            }
            semGradesFromDb[g.subject_name][g.semester] = parseFloat(g.grade);
          });
          setSemesterGrades(semGradesFromDb);
        }

        // Load semester plans
        const plans = await database.getUserSemesterPlans();
        if (plans && plans.length > 0) {
          const plansFromDb = {};
          plans.forEach(p => {
            if (!plansFromDb[p.subject_name]) {
              plansFromDb[p.subject_name] = [];
            }
            plansFromDb[p.subject_name].push({
              id: p.id,
              grade: parseFloat(p.planned_grade),
              weight: parseFloat(p.weight)
            });
          });
          setSemesterPlans(plansFromDb);
        }

        // Load subject goals
        const goals = await database.getUserSubjectGoals();
        if (goals && goals.length > 0) {
          const goalsFromDb = {};
          goals.forEach(g => {
            goalsFromDb[g.subject_name] = parseFloat(g.target_grade);
          });
          setSubjectGoals(goalsFromDb);
        }

        // Load exam simulator
        const exams = await database.getUserExamGrades();
        if (exams && exams.length > 0) {
          const examsFromDb = {};
          exams.forEach(e => {
            examsFromDb[e.subject_name] = parseFloat(e.simulated_grade);
          });
          setExamSimulator(examsFromDb);
        }

        setDataLoaded(true);
      } catch (err) {
        console.error('Error loading data from database:', err);
        // Fallback to localStorage
        setDataLoaded(true);
      }
    };

    loadFromDatabase();
  }, [user, dataLoaded, database.loading]);

  // Fallback: Load from localStorage if not logged in
  useLoadData({
    setSubjects,
    setSemesterGrades,
    setBmType,
    setCurrentSemester,
    setSemesterPlans,
    setSubjectGoals,
    setMaturnoteGoal
  });

  // Auto-save to localStorage (backup)
  useSaveData({
    subjects,
    semesterGrades,
    bmType,
    currentSemester,
    semesterPlans,
    subjectGoals,
    maturnoteGoal
  });

  // Database persistence functions
  const addControlToDatabase = async (subject, grade, weight, date = null, name = null) => {
    console.log('💾 addControlToDatabase called', { user: !!user, userId: database.userId, subject, grade, weight });
    if (user && database.userId) {
      try {
        const result = await database.addGrade(subject, grade, weight, currentSemester, name, date);
        console.log('💾 Grade saved to DB:', result);
      } catch (err) {
        console.error('Error saving grade to database:', err);
      }
    } else {
      console.log('💾 Skipped: no user or userId');
    }
  };

  const saveBulletinToDatabase = async (subject, semester, grade) => {
    if (user && database.userId) {
      try {
        await database.setSemesterGrade(subject, semester, grade);
      } catch (err) {
        console.error('Error saving bulletin grade to database:', err);
      }
    }
  };

  // Bulletin analysis
  const {
    isAnalyzing,
    analysisResult,
    handleFileUpload,
    resetAnalysis
  } = useBulletinAnalysis(
    subjects,
    setSubjects,
    semesterGrades,
    setSemesterGrades,
    validSubjects,
    currentSemester,
    addControlToDatabase,
    saveBulletinToDatabase
  );

  // Calculations
  const calculations = useGradeCalculations(
    subjects,
    semesterGrades,
    semesterPlans,
    examSimulator,
    bmType
  );

  // Reset analysis when tab changes
  useEffect(() => {
    resetAnalysis();
  }, [activeTab, resetAnalysis]);

  // Check if semester prompt should be displayed
  useEffect(() => {
    if (user && !authLoading) {
      const savedSemester = storage.get('currentSemester');
      const data = storage.get('bm-calculator-data');
      
      if (!savedSemester && (!data || !data.currentSemester)) {
        setShowSemesterPrompt(true);
      }
    }
  }, [user, authLoading]);

  const handleSemesterSelect = (semester) => {
    setCurrentSemester(semester);
    storage.set('currentSemester', semester);
    setShowSemesterPrompt(false);
  };

  // Conditional rendering after all hooks
  if (authLoading) {
    return (
      <AuthBackdrop contentClassName="w-full max-w-sm">
        <LoadingState />
      </AuthBackdrop>
    );
  }
  if (!user) {
    return (
      <AuthBackdrop>
        <CognitoAuthPanel />
      </AuthBackdrop>
    );
  }

  // Display semester prompt if necessary
  if (showSemesterPrompt) {
    return <SemesterPrompt onSelectSemester={handleSemesterSelect} />;
  }

  // ============ Management functions ============
  const addGrade = async (subject, grade, weight, date = null, name = null) => {
    // Check for duplicates: same subject, grade, date, and name
    const existingGrades = subjects[subject] || [];
    const isDuplicate = existingGrades.some(g => 
      Math.abs(g.grade - parseFloat(grade)) < 0.01 &&
      g.date === date &&
      g.name === name
    );
    
    if (isDuplicate) {
      console.log('⚠️ Duplicate grade detected, skipping:', { subject, grade, date, name });
      return;
    }
    
    const newGrade = {
      id: Date.now(),
      grade: parseFloat(grade),
      weight: parseFloat(weight),
      displayWeight: weight.toString(),
      date: date,
      name: name
    };
    
    setSubjects(prev => ({
      ...prev,
      [subject]: [...(prev[subject] || []), newGrade]
    }));

    // Save to database
    await addControlToDatabase(subject, grade, weight, date, name);
  };

  const removeGrade = async (subject, gradeId) => {
    setSubjects(prev => ({
      ...prev,
      [subject]: (prev[subject] || []).filter(g => g.id !== gradeId)
    }));

    // Remove from database
    if (user && database.userId) {
      try {
        await database.removeGrade(gradeId);
      } catch (err) {
        console.error('Error removing grade from database:', err);
      }
    }
  };

  const addPlannedControl = async (subject, grade, weight) => {
    const plan = { 
      id: Date.now(), 
      grade: parseFloat(grade), 
      weight: parseFloat(weight) 
    };
    setSemesterPlans(prev => ({
      ...prev,
      [subject]: [...(prev[subject] || []), plan]
    }));

    // Save to database
    if (user && database.userId) {
      try {
        await database.addSemesterPlan(subject, currentSemester, grade, weight);
      } catch (err) {
        console.error('Error saving plan to database:', err);
      }
    }
  };

  const removePlannedControl = async (subject, id) => {
    setSemesterPlans(prev => ({
      ...prev,
      [subject]: (prev[subject] || []).filter(p => p.id !== id)
    }));

    // Remove from database
    if (user && database.userId) {
      try {
        await database.removeSemesterPlan(id);
      } catch (err) {
        console.error('Error removing plan from database:', err);
      }
    }
  };

  const getSubjectsForSemester = (semester) => {
    const allSubjects = [
      ...BM_SUBJECTS[bmType].grundlagen,
      ...BM_SUBJECTS[bmType].schwerpunkt,
      ...BM_SUBJECTS[bmType].erganzung,
      ...BM_SUBJECTS[bmType].interdisziplinar
    ];
    return allSubjects.filter(subject => {
      const semesters = LEKTIONENTAFEL[bmType][subject];
      return semesters && semesters.includes(semester);
    });
  };

  const calculateRequiredGradeWithPlans = (subject, targetAverage, assumedWeight = 1) => {
    const baseGrades = subjects[subject] || [];
    const planned = (semesterPlans[subject] || []).map(p => ({ 
      grade: parseFloat(p.grade), 
      weight: parseFloat(p.weight) 
    }));
    const all = [...baseGrades, ...planned];
    if (all.length === 0) return null;
    
    // Convert rounded goal to real goal (e.g.: 6 -> 5.75, 5 -> 4.75)
    const realTarget = targetAverage - 0.25;
    
    const currentTotalWeight = all.reduce((sum, g) => sum + g.weight, 0);
    const currentSum = all.reduce((sum, g) => sum + (g.grade * g.weight), 0);
    const required = (realTarget * (currentTotalWeight + assumedWeight) - currentSum) / assumedWeight;
    return Math.round(required * 10) / 10;
  };

  const allSubjects = [
    ...BM_SUBJECTS[bmType].grundlagen,
    ...BM_SUBJECTS[bmType].schwerpunkt,
    ...BM_SUBJECTS[bmType].erganzung,
    ...BM_SUBJECTS[bmType].interdisziplinar
  ];
  const currentSemesterSubjects = getSubjectsForSemester(currentSemester);

  // ============ Render ============
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f8f9ff] via-white to-[#eef2ff] py-6 sm:py-10 px-3">
      <div className="max-w-7xl mx-auto px-2 sm:px-4">
        {/* Header */}
        <header className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 mb-6 border border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-indigo-900 flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl text-white">
                <Book className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              BM Grade Calculator
            </h1>
            {user && (
              <div className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-full ${database.userId && database.loading === false ? 'bg-gray-50 text-gray-600' : 'bg-red-100 text-red-700 border border-red-300'}`}>
                <div className={`w-2 h-2 rounded-full animate-pulse ${database.userId && database.loading === false ? 'bg-green-500' : 'bg-red-500'}`}></div>
                {/* Affiche "Synced" seulement si backend joignable */}
                {(database.userId && database.loading === false)
                  ? 'Synced'
                  : (
                    <span className="flex items-center">
                      <span className="font-semibold">Not synced with database</span>
                    </span>
                  )}
              </div>
            )}
          </div>
          
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">BM Type</label>
              <select 
                value={bmType} 
                onChange={(e) => {
                  const newBmType = e.target.value;
                  setBmType(newBmType);
                  if (user && database.userId) {
                    database.updateBmType(newBmType);
                  }
                }}
                className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 transition-all"
              >
                <option value="TAL">TAL - Technique, Architecture, Life Sciences</option>
                <option value="DL">DL - Dienstleistung</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Current Semester</label>
              <input 
                type="number" 
                min="1" 
                max="8"
                value={currentSemester}
                onChange={(e) => {
                  const newSemester = parseInt(e.target.value);
                  setCurrentSemester(newSemester);
                  // Sync to database
                  if (user && database.userId) {
                    database.updateSemester(newSemester);
                  }
                }}
                className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 transition-all"
              />
            </div>
          </div>
        </header>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 border border-gray-100 overflow-visible">
          {/* Mobile: Dropdown menu */}
          <div className="sm:hidden mb-6">
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value)}
              className="w-full p-3 bg-indigo-600 text-white rounded-xl font-medium text-center appearance-none cursor-pointer shadow-lg"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '20px' }}
            >
              <option value="current" className="bg-white text-gray-800">📊 Current Semester</option>
              <option value="semester-sim" className="bg-white text-gray-800">🎯 Semester Simulator</option>
              <option value="previous" className="bg-white text-gray-800">📚 Previous Bulletins</option>
              <option value="exam" className="bg-white text-gray-800">🎓 Final Exams</option>
            </select>
          </div>

          {/* Desktop: Tab buttons */}
          <div className="hidden sm:flex gap-2 mb-8 justify-center flex-wrap">
            <button
              onClick={() => setActiveTab('current')}
              className={`px-4 py-2.5 rounded-xl font-medium whitespace-nowrap transition-all duration-200 flex items-center gap-2 ${
                activeTab === 'current' 
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-200' 
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100 hover:shadow-md border border-gray-200'
              }`}
            >
              <Calculator className="w-4 h-4" />
              Current Semester
            </button>
            
            <button
              onClick={() => setActiveTab('semester-sim')}
              className={`px-4 py-2.5 rounded-xl font-medium whitespace-nowrap transition-all duration-200 flex items-center gap-2 ${
                activeTab === 'semester-sim' 
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-200' 
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100 hover:shadow-md border border-gray-200'
              }`}
            >
              <Target className="w-4 h-4" />
              Semester Simulator
            </button>

            <button
              onClick={() => setActiveTab('previous')}
              className={`px-4 py-2.5 rounded-xl font-medium whitespace-nowrap transition-all duration-200 flex items-center gap-2 ${
                activeTab === 'previous' 
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-200' 
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100 hover:shadow-md border border-gray-200'
              }`}
            >
              <Book className="w-4 h-4" />
              Previous Bulletins
            </button>

            <button
              onClick={() => setActiveTab('exam')}
              className={`px-4 py-2.5 rounded-xl font-medium whitespace-nowrap transition-all duration-200 flex items-center gap-2 ${
                activeTab === 'exam' 
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-200' 
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100 hover:shadow-md border border-gray-200'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              Final Exams
            </button>
          </div>

          {/* Semester Simulator Tab */}
          {activeTab === 'semester-sim' && (
            <div>
              <PromotionStatus 
                promotionStatus={calculations.getSimulatedPromotionStatus()}
                title="Semester Promotion Status"
              />
              
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Semester Simulator</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {currentSemesterSubjects.map(subject => {
                  const currentGrades = subjects[subject] || [];
                  const plannedControls = semesterPlans[subject] || [];
                  const goalGrade = subjectGoals[subject] || 5.0;
                  
                  return (
                    <SemesterSimulatorCard
                      key={subject}
                      subject={subject}
                      currentGrades={currentGrades}
                      plannedControls={plannedControls}
                      onAddPlan={(grade, weight) => addPlannedControl(subject, grade, weight)}
                      onRemovePlan={(id) => removePlannedControl(subject, id)}
                      currentAverage={calculations.getSemesterAverage(subject)}
                      simulatedAverage={calculations.getSimulatedSemesterAverage(subject)}
                      goalGrade={goalGrade}
                      onGoalChange={(goal) => setSubjectGoals({ ...subjectGoals, [subject]: goal })}
                      computeRequired={(assumedWeight) => calculateRequiredGradeWithPlans(subject, goalGrade, assumedWeight)}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Current Semester Tab */}
          {activeTab === 'current' && (
            <>
              <BulletinAnalysis
                isAnalyzing={isAnalyzing}
                analysisResult={analysisResult}
                onFileUpload={handleFileUpload}
                activeTab={activeTab}
              />
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Current Semester (S{currentSemester})</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {currentSemesterSubjects.map(subject => {
                    // Use grades from local state (subjects) which contains the details
                    const subjectGrades = subjects[subject] || [];
                    return (
                      <GradeCard
                        key={subject}
                        subject={subject}
                        grades={subjectGrades}
                        onAddGrade={addGrade}
                        onRemoveGrade={removeGrade}
                        semesterAverage={calculations.getSemesterAverage(subject)}
                        targetGrade={5.0}
                        requiredGrade={calculations.getRequiredSemesterGrade(subject, 5.0)}
                      />
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Previous Bulletins Tab */}
          {activeTab === 'previous' && (
            <>
              <BulletinAnalysis
                isAnalyzing={isAnalyzing}
                analysisResult={analysisResult}
                onFileUpload={handleFileUpload}
                activeTab={activeTab}
              />
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Previous Bulletins</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {allSubjects.map(subject => {
                    const semGrades = semesterGrades[subject] || {};
                    const erfahrungsnote = calculations.getErfahrungsnote(subject);
                    
                    return (
                      <div key={subject} className="border-2 border-purple-200 rounded-lg p-4 bg-gradient-to-r from-purple-50 to-pink-50">
                        <h3 className="font-semibold text-gray-800 mb-2">{subject}</h3>
                        
                        {Object.keys(semGrades).length > 0 ? (
                          <div className="space-y-1 mb-3">
                            {Object.entries(semGrades).map(([sem, grade]) => (
                              <div key={sem} className="flex justify-between text-sm">
                                <span className="text-gray-600">S{sem}:</span>
                                <span className="font-semibold">{grade.toFixed(1)}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500 text-sm mb-3">No semester grades</p>
                        )}
                        
                        {erfahrungsnote && (
                          <div className="border-t border-purple-200 pt-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-semibold text-gray-700">Erfahrungsnote:</span>
                              <span className="text-lg font-bold text-purple-700">{erfahrungsnote.toFixed(1)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Exam Tab */}
          {activeTab === 'exam' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Final Exams</h2>
              
              <div className="mb-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-blue-900 mb-1">Overall Average (Maturnote)</h3>
                    <p className="text-xs text-gray-600">Weighted average of all exam subjects</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600">Goal:</span>
                    <input
                      type="number"
                      step="0.1"
                      min="4"
                      max="6"
                      value={maturnoteGoal}
                      onChange={async (e) => {
                        const newGoal = parseFloat(e.target.value);
                        setMaturnoteGoal(newGoal);
                        if (database && database.updateMaturanoteGoal) {
                          await database.updateMaturanoteGoal(newGoal);
                        }
                      }}
                      className="w-16 p-1 border-2 border-indigo-300 rounded text-sm font-bold text-center"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Current average</div>
                    <div className={`text-3xl font-bold ${
                      calculations.getOverallAverage() && calculations.getOverallAverage() < 4.0
                        ? 'text-red-700'
                        : 'text-blue-700'
                    }`}>
                      {calculations.getOverallAverage()?.toFixed(1) || '-'}
                    </div>
                    {calculations.getOverallAverage() && calculations.getOverallAverage() < 4.0 && (
                      <div className="text-xs text-red-600 font-semibold mt-1">⚠️ Below 4.0</div>
                    )}
                  </div>
                  {calculations.getOverallAverage() && (
                    <div className={`px-4 py-2 rounded-lg font-semibold ${
                      calculations.getOverallAverage() < 4.0
                        ? 'bg-red-100 text-red-800'
                        : calculations.getOverallAverage() >= maturnoteGoal
                          ? 'bg-green-100 text-green-800'
                          : 'bg-orange-100 text-orange-800'
                    }`}>
                      {calculations.getOverallAverage() < 4.0
                        ? `⚠️ Dangerous: ${(4.0 - calculations.getOverallAverage()).toFixed(1)} points missing`
                        : calculations.getOverallAverage() >= maturnoteGoal
                          ? '✅ Goal achieved!'
                          : `📊 ${(maturnoteGoal - calculations.getOverallAverage()).toFixed(1)} points remaining`
                      }
                    </div>
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {[
                  ...BM_SUBJECTS[bmType].grundlagen,
                  ...(BM_SUBJECTS[bmType].schwerpunkt || []),
                  ...(BM_SUBJECTS[bmType].erganzung || []),
                  ...(BM_SUBJECTS[bmType].interdisziplinar || [])
                ].map(subject => {
                  const erfahrungsnote = calculations.getErfahrungsnote(subject);
                  const examGrade = examSimulator[subject];
                  const maturnote = calculations.getExamAverage(subject);
                  // Use the entered goal directly (to the tenth)
                  const requiredExam = calculations.getRequiredExamGrade(subject, maturnoteGoal);
                  
                  return (
                    <div key={subject} className="border-2 border-green-200 rounded-lg p-4 bg-gradient-to-r from-green-50 to-emerald-50">
                      <h3 className="font-semibold text-gray-800 mb-3">{subject}</h3>
                      
                      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                        <div>
                          <span className="text-gray-600">Erfahrungsnote:</span>
                          <div className="font-bold text-lg">{erfahrungsnote?.toFixed(1) || '-'}</div>
                        </div>
                        <div>
                          <span className="text-gray-600">Required grade:</span>
                          <div className="font-bold text-lg text-blue-600">
                            {requiredExam?.toFixed(1) || '-'}
                          </div>
                        </div>
                      </div>

                      <div className="mb-3">
                        <label className="block text-xs text-gray-700 mb-1">Simulated exam grade</label>
                        <input
                          type="number"
                          step="0.5"
                          min="1"
                          max="6"
                          value={examGrade || ''}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            if (value >= 1 && value <= 6) {
                              setExamSimulator({ ...examSimulator, [subject]: value });
                            } else if (e.target.value === '') {
                              setExamSimulator({ ...examSimulator, [subject]: '' });
                            }
                          }}
                          onBlur={(e) => {
                            const value = parseFloat(e.target.value);
                            if (value < 1) setExamSimulator({ ...examSimulator, [subject]: 1 });
                            if (value > 6) setExamSimulator({ ...examSimulator, [subject]: 6 });
                          }}
                          className="w-full p-2 border border-gray-300 rounded"
                        />
                      </div>

                      {maturnote && (
                        <div className="bg-white rounded p-3 text-center">
                          <div className="text-xs text-gray-600 mb-1">Maturnote</div>
                          <div className={`text-2xl font-bold ${
                            maturnote >= 5.5 ? 'text-green-700' :
                            maturnote >= 4.0 ? 'text-blue-700' :
                            'text-red-700'
                          }`}>
                            {maturnote.toFixed(1)}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
