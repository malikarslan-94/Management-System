import { useState, useEffect } from 'react'
import UserService, { User, CreateUserData, UpdateUserData } from '@/services/UserService'
import { QueryOptions, MongoResponse } from '@/services/MongoService'

export const useUsers = (options: QueryOptions = {}) => {
    const [users, setUsers] = useState<MongoResponse<User>>({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0
    })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchUsers = async () => {
        try {
            setLoading(true)
            setError(null)
            const response = await UserService.getUsers(options)
            // The response is already the data we need
            setUsers({
                data: response.data || [],
                total: response.total || 0,
                page: response.page || 1,
                limit: response.limit || 10,
                totalPages: response.totalPages || 0
            })
        } catch (err: any) {
            console.error('Error in fetchUsers:', err)
            setError(err.message || 'Failed to fetch users')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchUsers()
    }, [JSON.stringify(options)])

    const createUser = async (userData: CreateUserData): Promise<User | null> => {
        try {
            setError(null)
            const newUser = await UserService.createUser(userData)
            await fetchUsers() // Refresh the list
            return newUser
        } catch (err: any) {
            setError(err.message || 'Failed to create user')
            return null
        }
    }

    const updateUser = async (id: string, updateData: UpdateUserData): Promise<User | null> => {
        try {
            setError(null)
            const updatedUser = await UserService.updateUser(id, updateData)
            if (updatedUser) {
                await fetchUsers() // Refresh the list
            }
            return updatedUser
        } catch (err: any) {
            setError(err.message || 'Failed to update user')
            return null
        }
    }

    const deleteUser = async (id: string): Promise<boolean> => {
        try {
            setError(null)
            const success = await UserService.deleteUser(id)
            if (success) {
                await fetchUsers() // Refresh the list
            }
            return success
        } catch (err: any) {
            setError(err.message || 'Failed to delete user')
            return false
        }
    }

    const searchUsers = async (searchTerm: string): Promise<void> => {
        try {
            setLoading(true)
            setError(null)
            const response = await UserService.searchUsers(searchTerm, options)
            setUsers(response)
        } catch (err: any) {
            setError(err.message || 'Failed to search users')
        } finally {
            setLoading(false)
        }
    }

    return {
        users,
        loading,
        error,
        fetchUsers,
        createUser,
        updateUser,
        deleteUser,
        searchUsers,
        refresh: fetchUsers
    }
}

export const useUser = (id: string) => {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchUser = async () => {
        if (!id) return

        try {
            setLoading(true)
            setError(null)
            const userData = await UserService.getUserById(id)
            setUser(userData)
        } catch (err: any) {
            setError(err.message || 'Failed to fetch user')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchUser()
    }, [id])

    return {
        user,
        loading,
        error,
        refresh: fetchUser
    }
}

export const useUserStats = () => {
    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        inactive: 0,
        pending: 0,
        byRole: {} as Record<string, number>
    })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchStats = async () => {
        try {
            setLoading(true)
            setError(null)
            const userStats = await UserService.getUserStats()
            setStats(userStats)
        } catch (err: any) {
            setError(err.message || 'Failed to fetch user statistics')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchStats()
    }, [])

    return {
        stats,
        loading,
        error,
        refresh: fetchStats
    }
}
