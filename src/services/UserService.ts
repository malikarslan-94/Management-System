import MongoService, { MongoDocument, QueryOptions, MongoResponse } from './MongoService'

/**
 * Interface for user statistics
 */
interface UserStats {
    total: number
    active: number
    inactive: number
    pending: number
    byRole: Record<string, number>
}

/**
 * Interface for the aggregation result from MongoDB
 */
interface UserStatsAggregationResult {
    total: number
    active: number
    inactive: number
    pending: number
    roleStats?: Array<{ _id: string | null; count: number }>
}

export interface User extends MongoDocument {
    _id?: string
    name: string
    email: string
    role: 'admin' | 'user' | 'manager'
    status: 'active' | 'inactive' | 'pending'
    avatar?: string
    phone?: string
    address?: string
    createdAt?: Date
    updatedAt?: Date
}

export interface CreateUserData {
    name: string
    email: string
    role?: 'admin' | 'user' | 'manager'
    status?: 'active' | 'inactive' | 'pending'
    avatar?: string
    phone?: string
    address?: string
}

export interface UpdateUserData {
    name?: string
    email?: string
    role?: 'admin' | 'user' | 'manager'
    status?: 'active' | 'inactive' | 'pending'
    avatar?: string
    phone?: string
    address?: string
}

class UserService {
    private collection = 'users'

    async createUser(userData: CreateUserData): Promise<User> {
        const user = {
            ...userData,
            role: userData.role || 'user',
            status: userData.status || 'active',
            createdAt: new Date(),
            updatedAt: new Date(),
        }
        return MongoService.create<User>(this.collection, user)
    }

    async getUserById(id: string): Promise<User | null> {
        return MongoService.findById<User>(this.collection, id)
    }

    async getUsers(options: QueryOptions = {}): Promise<MongoResponse<User>> {
        return MongoService.find<User>(this.collection, options)
    }

    async getUsersByRole(role: string, options: QueryOptions = {}): Promise<MongoResponse<User>> {
        return MongoService.find<User>(this.collection, {
            ...options,
            filter: { ...options.filter, role }
        })
    }

    async getUsersByStatus(status: string, options: QueryOptions = {}): Promise<MongoResponse<User>> {
        return MongoService.find<User>(this.collection, {
            ...options,
            filter: { ...options.filter, status }
        })
    }

    async searchUsers(searchTerm: string, options: QueryOptions = {}): Promise<MongoResponse<User>> {
        const searchFilter = {
            $or: [
                { name: { $regex: searchTerm, $options: 'i' } },
                { email: { $regex: searchTerm, $options: 'i' } }
            ]
        }
        
        return MongoService.find<User>(this.collection, {
            ...options,
            filter: { ...options.filter, ...searchFilter }
        })
    }

    async updateUser(id: string, updateData: UpdateUserData): Promise<User | null> {
        const updatedData = {
            ...updateData,
            updatedAt: new Date(),
        }
        return MongoService.updateById<User>(this.collection, id, updatedData)
    }

    async deleteUser(id: string): Promise<boolean> {
        return MongoService.deleteById(this.collection, id)
    }

    async getUsersCount(filter: Record<string, any> = {}): Promise<number> {
        return MongoService.count(this.collection, filter)
    }

    /**
     * Get aggregated statistics about users
     * @returns Promise containing user statistics
     */
    async getUserStats(): Promise<UserStats> {
        const pipeline = [
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
                    inactive: { $sum: { $cond: [{ $eq: ['$status', 'inactive'] }, 1, 0] } },
                    pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
                }
            },
            {
                $lookup: {
                    from: this.collection,
                    pipeline: [
                        {
                            $group: {
                                _id: '$role',
                                count: { $sum: 1 }
                            }
                        }
                    ],
                    as: 'roleStats'
                }
            }
        ]

        const result = await MongoService.aggregate<UserStatsAggregationResult>(this.collection, pipeline)
        
        // Default empty stats
        const defaultStats: UserStats = {
            total: 0, 
            active: 0, 
            inactive: 0, 
            pending: 0, 
            byRole: {}
        }

        // If no result, return default stats
        if (!result || !result[0]) {
            return defaultStats
        }

        const stats = result[0]
        
        // Transform role stats into a more usable format
        const byRole = (stats.roleStats || []).reduce<Record<string, number>>((acc, role) => {
            if (role?._id) {
                acc[role._id] = role.count || 0
            }
            return acc
        }, {})

        // Return the complete stats object
        return {
            total: stats.total || 0,
            active: stats.active || 0,
            inactive: stats.inactive || 0,
            pending: stats.pending || 0,
            byRole
        }
    }
}

export default new UserService()
