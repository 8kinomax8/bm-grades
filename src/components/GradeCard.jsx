import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

/**
 * Component to display and manage grades for a subject
 */
export default function GradeCard({ 
  subject, 
  grades = [], 
  onAddGrade, 
  onRemoveGrade, 
  semesterAverage, 
  targetGrade, 
  requiredGrade 
}) {
  const [newGrade, setNewGrade] = useState('');
  const [weight, setWeight] = useState('1');

  const handleAdd = () => {
    if (!newGrade || !weight) return;
    onAddGrade(subject, parseFloat(newGrade), weight);
    setNewGrade('');
    setWeight('1');
  };

  const totalWeight = grades.reduce((sum, g) => sum + g.weight, 0);

  return (
    <div className="border-2 border-blue-200 rounded-lg p-4 bg-gradient-to-r from-blue-50 to-indigo-50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-800 text-sm">{subject}</h3>
        {semesterAverage && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">Avg:</span>
            <span className={`font-bold text-lg ${
              semesterAverage >= 5.5 ? 'text-green-700' :
              semesterAverage >= 4.0 ? 'text-blue-700' :
              'text-red-700'
            }`}>
              {semesterAverage.toFixed(1)}
            </span>
          </div>
        )}
      </div>

      {grades.length > 0 && (
        <div className="mb-3 space-y-1">
          <div className="text-xs text-gray-600 mb-1">
            Grades ({grades.length}) - Σ weight: {totalWeight.toFixed(2)}
          </div>
          {grades.map((g) => (
            <div
              key={g.id}
              className="flex items-center justify-between text-xs bg-white rounded p-2 border"
            >
              <div className="flex-1">
                <span className="font-semibold">{g.grade.toFixed(1)}</span>
                <span className="text-gray-500 mx-1">×</span>
                <span className="text-gray-600">{g.displayWeight || g.weight}</span>
                {g.date && (
                  <span className="text-gray-500 ml-2">({g.date})</span>
                )}
                {g.name && (
                  <span className="text-gray-700 ml-2 italic">{g.name}</span>
                )}
              </div>
              <button
                onClick={() => onRemoveGrade(subject, g.id)}
                className="text-red-600 hover:text-red-800 ml-2"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {requiredGrade !== null && requiredGrade !== undefined && (
        <div className={`mb-3 p-2 rounded text-xs ${
          requiredGrade < 1 ? 'bg-green-100 text-green-800' :
          requiredGrade > 6 ? 'bg-red-100 text-red-800' :
          'bg-blue-100 text-blue-800'
        }`}>
          {requiredGrade < 1 ? (
            `✅ Goal ${targetGrade} already achieved!`
          ) : requiredGrade > 6 ? (
            `⚠️ Goal ${targetGrade} impossible (requires ${requiredGrade.toFixed(1)})`
          ) : (
            `🎯 Required grade for ${targetGrade}: ${requiredGrade.toFixed(1)}`
          )}
        </div>
      )}

      <div className="border-t border-blue-200 pt-3">
        <label className="block text-xs text-gray-700 mb-2 font-semibold">
          Add a grade
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            step="0.5"
            min="1"
            max="6"
            placeholder="Grade"
            value={newGrade}
            onChange={(e) => setNewGrade(e.target.value)}
            className="flex-1 p-2 border border-gray-300 rounded text-sm"
          />
          <input
            type="text"
            placeholder="Wgt."
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="w-24 p-2 border border-gray-300 rounded text-sm"
          />
          <button
            onClick={handleAdd}
            className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
