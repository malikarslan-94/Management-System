export interface DatabaseConfig {
    mongodbUri: string
    databaseName: string
    apiBaseUrl: string
    enableMock: boolean
}

const databaseConfig: DatabaseConfig = {
    mongodbUri: import.meta.env.VITE_MONGODB_URI || 'mongodb://localhost:27017/management_system',
    databaseName: import.meta.env.VITE_MONGODB_DB_NAME || 'management_system',
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001',
    enableMock: import.meta.env.VITE_ENABLE_MOCK === 'true' || false,
}

export default databaseConfig
