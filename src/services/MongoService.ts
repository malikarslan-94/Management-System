import BaseService from './BaseService'
import databaseConfig from '@/configs/database.config'

export interface MongoDocument {
    _id?: string
    [key: string]: any
}

export interface QueryOptions {
    page?: number
    limit?: number
    sort?: Record<string, 1 | -1>
    filter?: Record<string, any>
}

export interface MongoResponse<T> {
    data: T[]
    total: number
    page: number
    limit: number
    totalPages: number
}

class MongoService {
    private baseUrl: string

    constructor() {
        this.baseUrl = databaseConfig.apiBaseUrl
    }

    // Generic CRUD operations
    async create<T extends MongoDocument>(
        collection: string,
        document: Omit<T, '_id'>
    ): Promise<T> {
        const response = await BaseService.post(`${this.baseUrl}/api/${collection}`, document)
        return response.data
    }

    async findById<T extends MongoDocument>(
        collection: string,
        id: string
    ): Promise<T | null> {
        try {
            const response = await BaseService.get(`${this.baseUrl}/api/${collection}/${id}`)
            return response.data
        } catch (error: any) {
            if (error.response?.status === 404) {
                return null
            }
            throw error
        }
    }

    async find<T extends MongoDocument>(
        collection: string,
        options: QueryOptions = {}
    ): Promise<MongoResponse<T>> {
        const { page = 1, limit = 10, sort, filter } = options
        
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
        })

        if (sort) {
            params.append('sort', JSON.stringify(sort))
        }

        if (filter) {
            params.append('filter', JSON.stringify(filter))
        }

        const response = await BaseService.get(`${this.baseUrl}/api/${collection}?${params}`)
        return response.data
    }

    async updateById<T extends MongoDocument>(
        collection: string,
        id: string,
        update: Partial<Omit<T, '_id'>>
    ): Promise<T | null> {
        try {
            const response = await BaseService.put(`${this.baseUrl}/api/${collection}/${id}`, update)
            return response.data
        } catch (error: any) {
            if (error.response?.status === 404) {
                return null
            }
            throw error
        }
    }

    async deleteById(collection: string, id: string): Promise<boolean> {
        try {
            await BaseService.delete(`${this.baseUrl}/api/${collection}/${id}`)
            return true
        } catch (error: any) {
            if (error.response?.status === 404) {
                return false
            }
            throw error
        }
    }

    async deleteMany(collection: string, filter: Record<string, any>): Promise<number> {
        const response = await BaseService.delete(`${this.baseUrl}/api/${collection}`, {
            data: { filter }
        })
        return response.data.deletedCount
    }

    async count(collection: string, filter: Record<string, any> = {}): Promise<number> {
        const response = await BaseService.get(`${this.baseUrl}/api/${collection}/count`, {
            params: { filter: JSON.stringify(filter) }
        })
        return response.data.count
    }

    // Aggregation pipeline
    async aggregate<T>(collection: string, pipeline: any[]): Promise<T[]> {
        const response = await BaseService.post(`${this.baseUrl}/api/${collection}/aggregate`, {
            pipeline
        })
        return response.data
    }
}

export default new MongoService()
