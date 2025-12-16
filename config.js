/**
 * Centralized Configuration File
 * Modify this file to change environment-specific settings
 * No need to search through the entire codebase
 */

// ============================================
// BACKEND CONFIGURATION
// ============================================

export const BACKEND_CONFIG = {
  // Server
  PORT: process.env.PORT || 3001,
  HOST: process.env.HOST || '0.0.0.0',
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Database (RDS)
  DATABASE: {
    host: process.env.RDS_HOST || 'localhost',
    user: process.env.RDS_USER || 'root',
    password: process.env.RDS_PASSWORD || '',
    database: process.env.RDS_DATABASE || 'bm_calculator',
    port: process.env.RDS_PORT || 3306,
    ssl: { rejectUnauthorized: false } // MySQL RDS nécessite TLS
  },

  // API Keys
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',

  // CORS Origins (Add your Amplify domain here)
  CORS_ORIGINS: [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    // Development/Staging/Production EC2 or custom domain
    process.env.FRONTEND_URL || 'http://localhost:5173',
    // Amplify hosted domains (wildcard)
    /\.amplifyapp\.com$/
  ].filter(Boolean),

  // Maximum file size for uploads (10MB)
  MAX_FILE_SIZE: '10mb'
};

// ============================================
// FRONTEND CONFIGURATION
// ============================================

export const FRONTEND_CONFIG = {
  // Backend API URL
  // Use VITE_API_URL env variable, fallback to local EC2 (change if needed)
  API_URL: import.meta.env?.VITE_API_URL || 'https://m346-backend.kinome.one',

  // AWS Cognito Configuration
  COGNITO: {
    authority: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_jmc1zF8iC',
    clientId: '2mfheoj99guf7t0d3r9n3d5t1m',
    redirectUri: import.meta.env?.VITE_COGNITO_REDIRECT_URI || 'https://main.d2xx7v3g6gelma.amplifyapp.com/',
    responseType: 'code',
    scope: 'openid email profile'
  },

  // Application Settings
  MAX_GRADE: 6.0,
  MIN_GRADE: 1.0,
  DEFAULT_BM_TYPE: 'TAL' // TAL or DL
};

// ============================================
// Validation Helper
// ============================================

export function validateConfig() {
  const errors = [];

  // Backend validation
  if (!BACKEND_CONFIG.ANTHROPIC_API_KEY && BACKEND_CONFIG.NODE_ENV === 'production') {
    errors.push('❌ ANTHROPIC_API_KEY is not set');
  }
  if (!BACKEND_CONFIG.DATABASE.password && BACKEND_CONFIG.NODE_ENV === 'production') {
    errors.push('❌ RDS_PASSWORD is not set');
  }

  // Frontend validation
  if (!FRONTEND_CONFIG.API_URL) {
    errors.push('❌ VITE_API_URL is not set');
  }
  if (!FRONTEND_CONFIG.COGNITO.clientId) {
    errors.push('⚠️ Cognito clientId is not set');
  }

  if (errors.length > 0) {
    console.error('Configuration Errors:');
    errors.forEach(err => console.error(err));
    if (BACKEND_CONFIG.NODE_ENV === 'production') {
      throw new Error('Missing critical configuration');
    }
  }

  return errors.length === 0;
}

export default {
  BACKEND_CONFIG,
  FRONTEND_CONFIG,
  validateConfig
};
