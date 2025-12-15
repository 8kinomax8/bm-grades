import React from 'react';
import { Upload, Camera } from 'lucide-react';

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
                Scan the assessment list on SAL
              </h3>
            </>
          ) : (
            <>
              <Upload className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-800">
                Analyze a bulletin
              </h3>
            </>
          )}
        </div>
      </div>

      <div className="mb-4">
        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
              {activeTab === 'current' ? (
                <>
                  <Camera className="w-10 h-10 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600 md:hidden">
                    Take a photo or choose an image (JPG, PNG)
                  </p>
                  <p className="text-sm text-gray-600 hidden md:block">
                    Choose an image (JPG, PNG)
                  </p>
                </>
              ) : (
                <>
                  <Upload className="w-10 h-10 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600 md:hidden">
                    Bulletin PDF or image
                  </p>
                  <p className="text-sm text-gray-600 hidden md:block">
                    Choose a bulletin (PDF or image)
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
              {...(activeTab === 'current' ? { capture: 'environment' } : {})}
            />
        </label>
      </div>

      {isAnalyzing && (
        <div className="flex items-center justify-center p-4 bg-blue-50 rounded-lg">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
          <span className="text-blue-600">Analysis in progress...</span>
        </div>
      )}

      {analysisResult && (
        <div className="mt-4">
          {analysisResult.error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
              <strong>Error:</strong> {analysisResult.error}
            </div>
          ) : analysisResult.controls ? (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="font-semibold text-green-800 mb-2">
                ✅ {analysisResult.message}
              </div>
              {analysisResult.controls.length > 0 && (
                <div className="space-y-2 text-sm text-green-700">
                  {analysisResult.controls.map((control, idx) => (
                    <div key={idx} className="bg-white rounded p-2">
                      {/* Mobile: 2 lignes */}
                      <div className="md:hidden">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-green-800 text-xs">{control.subject}</span>
                          <span className="font-bold text-green-700 text-lg">{control.grade}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-700 truncate flex-1 mr-2">{control.name}</span>
                          <span className="text-gray-500 whitespace-nowrap">{control.date}</span>
                        </div>
                      </div>
                      {/* Desktop: 1 ligne */}
                      <div className="hidden md:flex items-center justify-between">
                        <span className="font-medium text-green-800 w-1/4">{control.subject}</span>
                        <span className="text-gray-700 flex-1 px-2 truncate">{control.name}</span>
                        <span className="font-bold text-green-700 w-16 text-right">{control.grade}</span>
                        <span className="text-gray-500 text-xs w-24 text-right">{control.date}</span>
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
