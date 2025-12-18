import React from 'react';
import { Upload, Camera } from 'lucide-react';
import { formatSwissDate } from '../utils';

/**
 * Component to display the result of analyzing a bulletin or SAL screenshot
 */
export default function BulletinAnalysis({
  isAnalyzing,
  analysisResult,
  onFileUpload,
  activeTab
}) {
  return (
    <div className={`rounded-lg shadow-sm p-6 mb-6 border-2 ${activeTab === 'current' ? 'bg-blue-50 border-blue-200' : 'bg-purple-50 border-purple-200'}`}> 
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {activeTab === 'current' ? (
            <>
              <Camera className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-800">
                Scan SAL
              </h3>
            </>
          ) : (
            <>
              <Upload className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-800">
                Scan bulletin
              </h3>
            </>
          )}
        </div>
      </div>

      <div className="mb-4">
        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
          <div className="flex flex-col items-center justify-center pt-5 pb-6 px-4">
              {activeTab === 'current' ? (
                <>
                  <Camera className="w-10 h-10 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600 text-center">
                    Photo or image (JPG, PNG)
                  </p>
                </>
              ) : (
                <>
                  <Upload className="w-10 h-10 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600 text-center">
                    PDF or image
                  </p>
                </>
              )}
          </div>
            <input
              type="file"
              className="hidden"
              accept={activeTab === 'current' ? 'image/*' : 'image/*,application/pdf'}
              onChange={(e) => onFileUpload(e, activeTab)}
              disabled={isAnalyzing}
            />
        </label>
      </div>

      {analysisResult && (
        <div className="mt-4">
          {analysisResult.error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
              <strong>Erreur :</strong> {analysisResult.error}
            </div>
          ) : analysisResult.controls ? (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="font-semibold text-green-800 mb-2">
                ✅ Bulletin S{analysisResult.semester} analysé
              </div>
              <ul className="list-disc pl-5 text-green-900">
                {analysisResult.controls.length === 0 ? (
                  <li>Aucun contrôle ajouté (aucune note trouvée ou déjà existante).</li>
                ) : analysisResult.controls.map((c, i) => (
                  <li key={i}>{c.subject} : {c.grade} ({c.date})</li>
                ))}
              </ul>
              {analysisResult.message && (
                <div className="mt-2 text-green-700 text-sm">{analysisResult.message}</div>
              )}
            </div>
          ) : analysisResult.grades ? (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="font-semibold text-green-800 mb-2">
                ✅ Bulletin S{analysisResult.semester} enregistré
              </div>
              <ul className="list-disc pl-5 text-green-900">
                {Object.keys(analysisResult.grades).length === 0 ? (
                  <li>Aucune note trouvée ou ajoutée.</li>
                ) : Object.entries(analysisResult.grades).map(([subject, grade], i) => (
                  <li key={i}>{subject} : {grade}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
                      <div className="hidden md:flex items-center justify-between">
                        <span className="font-medium text-green-800 w-48 flex-shrink-0">{control.subject}</span>
                        <span className="text-gray-700 flex-1 px-4 text-left">{control.name}</span>
                        <span className="font-bold text-green-700 w-16 text-right flex-shrink-0">{control.grade}</span>
                        <span className="text-gray-500 text-xs w-24 text-right flex-shrink-0">{formatSwissDate(control.date)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : analysisResult.grades ? (
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="font-semibold text-purple-800 mb-2">
                ✅ Bulletin S{analysisResult.semester} analyzed
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {Object.entries(analysisResult.grades).map(([subject, grade]) => (
                  <div key={subject} className="flex justify-between bg-white rounded p-2">
                    <span className="text-gray-700">{subject}</span>
                    <span className="font-bold text-purple-700">{grade.toFixed(1)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
