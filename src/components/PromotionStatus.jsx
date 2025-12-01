import React from 'react';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

/**
 * Composant pour afficher le statut de promotion semestrielle (BM1)
 */
export default function PromotionStatus({ promotionStatus, title = "État de Promotion Semestrielle (BM1)" }) {
  if (!promotionStatus || promotionStatus.average === null) {
    return null;
  }

  const { average, deficit, insufficientCount, isPromoted, conditions } = promotionStatus;

  const getStatusIcon = (isOk) => {
    if (isOk) return <CheckCircle className="w-5 h-5 text-green-600" />;
    return <XCircle className="w-5 h-5 text-red-600" />;
  };

  const getStatusColor = (isOk) => {
    return isOk ? 'bg-green-50 border-green-300 text-green-800' : 'bg-red-50 border-red-300 text-red-800';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        <div className={`px-4 py-2 rounded-full font-bold ${
          isPromoted 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {isPromoted ? '✅ PROMU' : '❌ NON PROMU'}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Condition 1: Moyenne générale */}
        <div className={`border-2 rounded-lg p-4 ${getStatusColor(conditions.averageOk)}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold">Moyenne générale</span>
            {getStatusIcon(conditions.averageOk)}
          </div>
          <div className="text-2xl font-bold">{average.toFixed(1)}</div>
          <div className="text-xs mt-1">
            {conditions.averageOk ? '≥ 4.0 ✓' : '< 4.0 ✗'}
          </div>
          <div className="text-xs text-gray-600 mt-1">
            (IDAF exclu, arrondi au dixième)
          </div>
        </div>

        {/* Condition 2: Déficit total */}
        <div className={`border-2 rounded-lg p-4 ${getStatusColor(conditions.deficitOk)}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold">Déficit total</span>
            {getStatusIcon(conditions.deficitOk)}
          </div>
          <div className="text-2xl font-bold">{deficit.toFixed(1)}</div>
          <div className="text-xs mt-1">
            {conditions.deficitOk ? '≤ 2.0 ✓' : '> 2.0 ✗'}
          </div>
          <div className="text-xs text-gray-600 mt-1">
            Σ(4.0 - note) pour notes &lt; 4
          </div>
        </div>

        {/* Condition 3: Notes insuffisantes */}
        <div className={`border-2 rounded-lg p-4 ${getStatusColor(conditions.insufficientOk)}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold">Notes insuffisantes</span>
            {getStatusIcon(conditions.insufficientOk)}
          </div>
          <div className="text-2xl font-bold">{insufficientCount}</div>
          <div className="text-xs mt-1">
            {conditions.insufficientOk ? '≤ 2 ✓' : '> 2 ✗'}
          </div>
          <div className="text-xs text-gray-600 mt-1">
            Nombre de notes &lt; 4.0
          </div>
        </div>
      </div>

      {!isPromoted && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-300 rounded-lg flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-800">
            <strong>Attention :</strong> Les conditions de promotion ne sont pas remplies. 
            {!conditions.averageOk && ' Moyenne insuffisante.'}
            {!conditions.deficitOk && ' Déficit trop élevé.'}
            {!conditions.insufficientOk && ' Trop de notes insuffisantes.'}
          </div>
        </div>
      )}
    </div>
  );
}
