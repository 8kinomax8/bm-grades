import React, { useState, useEffect, useRef } from 'react';
import { Book, Calculator, TrendingUp, BarChart, Target } from 'lucide-react';
import {LineChart, Line, BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BM_SUBJECTS, EXAM_SUBJECTS, LEKTIONENTAFEL } from './constants';
import { GradeCard, SemesterSimulatorCard, BulletinAnalysis, PromotionStatus } from './components';
import { useLoadData, useSaveData, useGradeCalculations, useBulletinAnalysis } from './hooks';
import CognitoAuthPanel from './components/CognitoAuthPanel';
import SemesterPrompt from './components/SemesterPrompt';
import { storage } from './utils';
import { useAuth as useCognitoAuth } from 'react-oidc-context';

const AuthBackdrop = ({ children, contentClassName = 'w-full max-w-xl' }) => (
  <div className="relative min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-[#eef2ff] via-[#fdfbff] to-[#e5e4ff] overflow-hidden">
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
  const [showScrollHint, setShowScrollHint] = useState(false);
  const [showSemesterPrompt, setShowSemesterPrompt] = useState(false);
  const tabBarRef = useRef(null);

  // ============ Custom hooks ============
  const validSubjects = new Set(Object.keys(LEKTIONENTAFEL[bmType] || {}));
  
  // Load data on startup
  useLoadData({
    setSubjects,
    setSemesterGrades,
    setBmType,
    setCurrentSemester,
    setSemesterPlans,
    setSubjectGoals,
    setMaturnoteGoal
  });

  // Auto-save
  useSaveData({
    subjects,
    semesterGrades,
    bmType,
    currentSemester,
    semesterPlans,
    subjectGoals,
    maturnoteGoal
  });

  // Placeholder hooks for future persistence integration
  const addControlToSupabase = async () => {};
  const saveBulletinToSupabase = async () => {};

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
    addControlToSupabase,
    saveBulletinToSupabase
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

  // Detect if tab bar overflows (requires horizontal scroll)
  useEffect(() => {
    const updateHint = () => {
      if (tabBarRef.current) {
        const el = tabBarRef.current;
        // Small buffer for rounding differences
        setShowScrollHint(el.scrollWidth > el.clientWidth + 4);
      }
    };
    updateHint();
    window.addEventListener('resize', updateHint);
    return () => window.removeEventListener('resize', updateHint);
  }, [activeTab]);

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
  const addGrade = (subject, grade, weight, date = null, name = null) => {
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
  };

  const removeGrade = (subject, gradeId) => {
    setSubjects(prev => ({
      ...prev,
      [subject]: (prev[subject] || []).filter(g => g.id !== gradeId)
    }));
  };

  const addPlannedControl = (subject, grade, weight) => {
    const plan = { 
      id: Date.now(), 
      grade: parseFloat(grade), 
      weight: parseFloat(weight) 
    };
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

  // ============ Data for charts ============
  const getChartData = () => {
    const allSubjects = [
      ...BM_SUBJECTS[bmType].grundlagen,
      ...BM_SUBJECTS[bmType].schwerpunkt,
      ...BM_SUBJECTS[bmType].erganzung,
      ...BM_SUBJECTS[bmType].interdisziplinar
    ];
    
    return allSubjects.map(subject => {
      const erfahrungsnote = calculations.getErfahrungsnote(subject);
      // const exam = examSimulator[subject];
      const maturnote = EXAM_SUBJECTS[bmType].includes(subject) 
        ? calculations.getExamAverage(subject)
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
    const allSubjects = [
      ...BM_SUBJECTS[bmType].grundlagen,
      ...BM_SUBJECTS[bmType].schwerpunkt,
      ...BM_SUBJECTS[bmType].erganzung,
      ...BM_SUBJECTS[bmType].interdisziplinar
    ];
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

  const allSubjects = [
    ...BM_SUBJECTS[bmType].grundlagen,
    ...BM_SUBJECTS[bmType].schwerpunkt,
    ...BM_SUBJECTS[bmType].erganzung,
    ...BM_SUBJECTS[bmType].interdisziplinar
  ];
  const currentSemesterSubjects = getSubjectsForSemester(currentSemester);

  // ============ Render ============
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f8f9ff] via-white to-[#eef2ff] py-10 px-3">
      <div className="max-w-7xl mx-auto px-2 sm:px-4">
        {/* Header */}
        <header className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h1 className="text-3xl font-bold text-indigo-900 mb-4 flex items-center gap-3">
            <Book className="w-8 h-8" />
            BM Grade Calculator
          </h1>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">BM Type</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Current Semester</label>
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

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          {showScrollHint && (
            <div className="text-center text-xs text-gray-500 mb-2 select-none">
              <span className="inline-flex items-center gap-1">
                <svg width="16" height="16" fill="none" viewBox="0 0 16 16" className="inline"><path d="M2 8h12M6 4l-4 4 4 4" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M10 12l4-4-4-4" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Scroll to see other tabs
              </span>
            </div>
          )}
          <div
            ref={tabBarRef}
            className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-none pl-2 pr-2 lg:justify-center"
            style={{
              WebkitOverflowScrolling: 'touch',
              scrollSnapType: 'x mandatory',
              overscrollBehaviorX: 'contain',
              minWidth: 0
            }}
          >
            <button
              onClick={() => setActiveTab('current')}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${
                activeTab === 'current' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Calculator className="w-4 h-4 inline mr-2" />
              Current Semester
            </button>
            
            <button
              onClick={() => setActiveTab('semester-sim')}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${
                activeTab === 'semester-sim' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Target className="w-4 h-4 inline mr-2" />
              Semester Simulator
            </button>

            <button
              onClick={() => setActiveTab('previous')}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${
                activeTab === 'previous' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Book className="w-4 h-4 inline mr-2" />
              Previous Bulletins
            </button>

            <button
              onClick={() => setActiveTab('exam')}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${
                activeTab === 'exam' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              <TrendingUp className="w-4 h-4 inline mr-2" />
              Final Exams
            </button>

            <button
              onClick={() => setActiveTab('charts')}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${
                activeTab === 'charts' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              <BarChart className="w-4 h-4 inline mr-2" />
              Charts
            </button>
          </div>

          {/* Semester Simulator Tab */}
          {activeTab === 'semester-sim' && (
            <div>
              <PromotionStatus 
                promotionStatus={calculations.getSimulatedPromotionStatus()}
                title="Semester Promotion Status (BM1)"
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
                      onChange={(e) => setMaturnoteGoal(parseFloat(e.target.value))}
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

          {/* Charts Tab */}
          {activeTab === 'charts' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Charts and Statistics</h2>
              
              {getSubjectProgressData().length > 0 && (
                <div className="mb-8 bg-white p-6 rounded-lg shadow">
                  <h3 className="text-xl font-semibold mb-4">Evolution by Semester</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={getSubjectProgressData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="semester" />
                      <YAxis domain={[1, 6]} />
                      <Tooltip />
                      <Legend />
                      {Object.keys(getSubjectProgressData()[0] || {})
                        .filter(key => key !== 'semester')
                        .map((subject, idx) => (
                          <Line 
                            key={subject}
                            type="monotone" 
                            dataKey={subject} 
                            stroke={`hsl(${idx * 360 / 10}, 70%, 50%)`}
                            strokeWidth={2}
                          />
                        ))
                      }
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {getChartData().length > 0 && (
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-xl font-semibold mb-4">Comparison Erfahrungsnote vs Maturnote</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <RechartsBarChart data={getChartData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 6]} />
                      <Tooltip content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white p-2 border rounded shadow">
                              <p className="font-semibold">{payload[0].payload.fullName}</p>
                              {payload.map((entry, index) => (
                                <p key={index} style={{ color: entry.color }}>
                                  {entry.name}: {entry.value.toFixed(1)}
                                </p>
                              ))}
                            </div>
                          );
                        }
                        return null;
                      }} />
                      <Legend />
                      <Bar dataKey="Erfahrungsnote" fill="#8884d8" />
                      <Bar dataKey="Maturnote" fill="#82ca9d" />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
