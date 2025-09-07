export interface DatabaseConfig {
  mongoUri: string;
  dbName: string;
  apiBaseUrl: string;
  mockEnabled: boolean;
}

// Get environment variables with Vite's import.meta.env
const env = import.meta.env;

const databaseConfig: DatabaseConfig = {
  mongoUri: env.VITE_MONGODB_URI || 'mongodb+srv://malikarslan:malikarslan@cluster0.2sxwz.mongodb.net',
  dbName: env.VITE_MONGODB_DB_NAME || 'camp_management',
  apiBaseUrl: env.VITE_API_BASE_URL || 'http://localhost:3001',
  mockEnabled: env.VITE_ENABLE_MOCK === 'true',
};

// Validate required environment variables
const requiredEnvVars = ['VITE_API_BASE_URL'];
const missingVars = requiredEnvVars.filter(varName => !env[varName]);

if (missingVars.length > 0 && !databaseConfig.mockEnabled) {
  console.warn(`Warning: The following required environment variables are missing: ${missingVars.join(', ')}`);
}

export default databaseConfig;
