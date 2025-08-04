import MongoService, { MongoDocument, QueryOptions, MongoResponse } from './MongoService'

/**
 * Interface for product statistics
 */
interface ProductStats {
    total: number
    active: number
    inactive: number
    discontinued: number
    lowStock: number
    totalValue: number
    byCategory: Record<string, number>
}

export interface Product extends MongoDocument {
    _id?: string
    name: string
    description?: string
    category: string
    price: number
    stock: number
    sku: string
    status: 'active' | 'inactive' | 'discontinued'
    images?: string[]
    tags?: string[]
    specifications?: Record<string, any>
    createdAt?: Date
    updatedAt?: Date
}

export interface CreateProductData {
    name: string
    description?: string
    category: string
    price: number
    stock: number
    sku: string
    status?: 'active' | 'inactive' | 'discontinued'
    images?: string[]
    tags?: string[]
    specifications?: Record<string, any>
}

export interface UpdateProductData {
    name?: string
    description?: string
    category?: string
    price?: number
    stock?: number
    sku?: string
    status?: 'active' | 'inactive' | 'discontinued'
    images?: string[]
    tags?: string[]
    specifications?: Record<string, any>
}

class ProductService {
    private collection = 'products'

    async createProduct(productData: CreateProductData): Promise<Product> {
        const product = {
            ...productData,
            status: productData.status || 'active',
            createdAt: new Date(),
            updatedAt: new Date(),
        }
        return MongoService.create<Product>(this.collection, product)
    }

    async getProductById(id: string): Promise<Product | null> {
        return MongoService.findById<Product>(this.collection, id)
    }

    async getProducts(options: QueryOptions = {}): Promise<MongoResponse<Product>> {
        return MongoService.find<Product>(this.collection, options)
    }

    async getProductsByCategory(category: string, options: QueryOptions = {}): Promise<MongoResponse<Product>> {
        return MongoService.find<Product>(this.collection, {
            ...options,
            filter: { ...options.filter, category }
        })
    }

    async getProductsByStatus(status: string, options: QueryOptions = {}): Promise<MongoResponse<Product>> {
        return MongoService.find<Product>(this.collection, {
            ...options,
            filter: { ...options.filter, status }
        })
    }

    async getLowStockProducts(threshold: number = 10, options: QueryOptions = {}): Promise<MongoResponse<Product>> {
        return MongoService.find<Product>(this.collection, {
            ...options,
            filter: { ...options.filter, stock: { $lte: threshold } }
        })
    }

    async searchProducts(searchTerm: string, options: QueryOptions = {}): Promise<MongoResponse<Product>> {
        const searchFilter = {
            $or: [
                { name: { $regex: searchTerm, $options: 'i' } },
                { description: { $regex: searchTerm, $options: 'i' } },
                { sku: { $regex: searchTerm, $options: 'i' } },
                { tags: { $in: [new RegExp(searchTerm, 'i')] } }
            ]
        }
        
        return MongoService.find<Product>(this.collection, {
            ...options,
            filter: { ...options.filter, ...searchFilter }
        })
    }

    async getProductsBySku(sku: string): Promise<Product | null> {
        const result = await MongoService.find<Product>(this.collection, {
            filter: { sku },
            limit: 1
        })
        return result.data[0] || null
    }

    async updateProduct(id: string, updateData: UpdateProductData): Promise<Product | null> {
        const updatedData = {
            ...updateData,
            updatedAt: new Date(),
        }
        return MongoService.updateById<Product>(this.collection, id, updatedData)
    }

    async updateStock(id: string, quantity: number, operation: 'add' | 'subtract' | 'set' = 'set'): Promise<Product | null> {
        const product = await this.getProductById(id)
        if (!product) return null

        let newStock: number
        switch (operation) {
            case 'add':
                newStock = product.stock + quantity
                break
            case 'subtract':
                newStock = Math.max(0, product.stock - quantity)
                break
            case 'set':
            default:
                newStock = quantity
                break
        }

        return this.updateProduct(id, { stock: newStock })
    }

    async deleteProduct(id: string): Promise<boolean> {
        return MongoService.deleteById(this.collection, id)
    }

    async getProductsCount(filter: Record<string, any> = {}): Promise<number> {
        return MongoService.count(this.collection, filter)
    }

    /**
     * Get aggregated statistics about products
     * @returns Promise containing product statistics
     */
    async getProductStats(): Promise<ProductStats> {
        const pipeline = [
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
                    inactive: { $sum: { $cond: [{ $eq: ['$status', 'inactive'] }, 1, 0] } },
                    discontinued: { $sum: { $cond: [{ $eq: ['$status', 'discontinued'] }, 1, 0] } },
                    lowStock: { $sum: { $cond: [{ $lte: ['$stock', 10] }, 1, 0] } },
                    totalValue: { $sum: { $multiply: ['$price', '$stock'] } }
                }
            },
            {
                $lookup: {
                    from: this.collection,
                    pipeline: [
                        {
                            $group: {
                                _id: '$category',
                                count: { $sum: 1 }
                            }
                        }
                    ],
                    as: 'categoryStats'
                }
            }
        ]

        interface AggregationResult {
            total: number
            active: number
            inactive: number
            discontinued: number
            lowStock: number
            totalValue: number
            categoryStats?: Array<{ _id: string | null; count: number }>
        }

        const result = await MongoService.aggregate<AggregationResult>(this.collection, pipeline)
        
        // Default empty stats
        const defaultStats: ProductStats = {
            total: 0, 
            active: 0, 
            inactive: 0, 
            discontinued: 0, 
            lowStock: 0, 
            totalValue: 0, 
            byCategory: {}
        }

        // If no result, return default stats
        if (!result || !result[0]) {
            return defaultStats
        }

        const stats = result[0]
        
        // Transform category stats into a more usable format
        const byCategory = (stats.categoryStats || []).reduce<Record<string, number>>((acc, category) => {
            if (category?._id) {
                acc[category._id] = category.count || 0
            }
            return acc
        }, {})

        // Return the complete stats object
        return {
            total: stats.total || 0,
            active: stats.active || 0,
            inactive: stats.inactive || 0,
            discontinued: stats.discontinued || 0,
            lowStock: stats.lowStock || 0,
            totalValue: stats.totalValue || 0,
            byCategory
        }
    }

    async getCategories(): Promise<string[]> {
        const pipeline = [
            {
                $group: {
                    _id: '$category'
                }
            },
            {
                $sort: { _id: 1 }
            }
        ]

        const result = await MongoService.aggregate(this.collection, pipeline)
        return result.map((item: any) => item._id).filter(Boolean)
    }
}

export default new ProductService()
