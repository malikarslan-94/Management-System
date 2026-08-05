// src/components/admin-dashboard/RoomsList.jsx
import { Badge, Button } from '@/components/ui'
import React, { useMemo } from 'react'
import { HiOutlinePencil, HiOutlineTrash, HiOutlineHome, HiOutlineCheckCircle, HiOutlineXCircle } from 'react-icons/hi'

const RoomsList = ({ rooms, onEdit, onDelete, camps }) => {
    // Sort rooms by creation date (latest first)
    const sortedRooms = Array.isArray(rooms)
        ? [...rooms].sort(
              (a, b) =>
                  new Date(b.createdAt || b.updatedAt || 0) -
                  new Date(a.createdAt || a.updatedAt || 0),
          )
        : []

    // Calculate statistics from ACTUAL Room documents (not Camp model fields)
    const stats = useMemo(() => {
        const roomsArray = Array.isArray(rooms) ? rooms : []
        const campsArray = Array.isArray(camps) ? camps : []
        
        // Calculate from actual Room documents (useRooms returns a status enum)
        const totalRooms = roomsArray.length
        const availableRooms = roomsArray.filter(
            (room) => room.status === 'available'
        ).length
        const occupiedRooms = roomsArray.filter(
            (room) => room.status === 'occupied'
        ).length
        
        // Calculate breakdown by camp from actual Room documents
        const roomsByCamp = {}
        roomsArray.forEach((room) => {
            const campId = typeof room.camp === 'object' && room.camp?._id 
                ? room.camp._id 
                : room.camp
            const campName = typeof room.camp === 'object' && room.camp?.name
                ? room.camp.name
                : campsArray.find((c) => c._id === campId)?.name || 'Unknown Camp'
            
            if (!roomsByCamp[campName]) {
                roomsByCamp[campName] = {
                    total: 0,
                    available: 0,
                    occupied: 0
                }
            }
            
            roomsByCamp[campName].total++
            if (room.status === 'available') {
                roomsByCamp[campName].available++
            } else {
                roomsByCamp[campName].occupied++
            }
        })
        
        // Log stats for verification
        console.log('RoomsList Stats:', {
            totalRooms,
            availableRooms,
            occupiedRooms,
            occupancyRate: totalRooms > 0 
                ? Math.round((occupiedRooms / totalRooms) * 100) 
                : 0,
            roomsByCamp,
        })
        
        return { totalRooms, availableRooms, occupiedRooms, roomsByCamp }
    }, [rooms, camps])

    const STATUS_CLASSES = {
        available: 'bg-green-100 text-green-800',
        occupied: 'bg-amber-100 text-amber-800',
        maintenance: 'bg-red-100 text-red-800',
        cleaning: 'bg-blue-100 text-blue-800',
    }

    const getStatusClass = (status) =>
        STATUS_CLASSES[status] || 'bg-gray-100 text-gray-800'

    const getCampName = (camp) => {
        // Handle populated camp object
        if (typeof camp === 'object' && camp?.name) {
            return camp.name
        }
        // Handle camp ID string
        const campId = typeof camp === 'object' && camp?._id ? camp._id : camp
        const foundCamp = camps.find((c) => c._id === campId)
        return foundCamp ? foundCamp.name : 'Unknown Camp'
    }

    return (
        <div className="space-y-4">
            {/* Statistics Summary - Calculated from CAMPS data (totalRooms/occupiedRooms) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                    <div className="flex items-center">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <HiOutlineHome className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Total Rooms</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.totalRooms}</p>
                            <p className="text-xs text-gray-500">From room documents</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                    <div className="flex items-center">
                        <div className="p-2 bg-green-100 rounded-lg">
                            <HiOutlineCheckCircle className="w-6 h-6 text-green-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Available</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.availableRooms}</p>
                            <p className="text-xs text-gray-500">
                                {stats.totalRooms > 0 
                                    ? Math.round((stats.availableRooms / stats.totalRooms) * 100) 
                                    : 0}% of total
                            </p>
                        </div>
                    </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                    <div className="flex items-center">
                        <div className="p-2 bg-red-100 rounded-lg">
                            <HiOutlineXCircle className="w-6 h-6 text-red-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Occupied</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.occupiedRooms}</p>
                            <p className="text-xs text-gray-500">
                                {stats.totalRooms > 0 
                                    ? Math.round((stats.occupiedRooms / stats.totalRooms) * 100) 
                                    : 0}% of total
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Breakdown by Camp */}
            {Object.keys(stats.roomsByCamp).length > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Rooms by Camp</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {Object.entries(stats.roomsByCamp).map(([campName, campStats]) => (
                            <div key={campName} className="bg-white rounded p-3 border border-gray-200">
                                <p className="font-medium text-gray-900">{campName}</p>
                                <p className="text-sm text-gray-600">
                                    Total: <span className="font-semibold">{campStats.total}</span> | 
                                    Available: <span className="text-green-600 font-semibold">{campStats.available}</span> | 
                                    Occupied: <span className="text-red-600 font-semibold">{campStats.occupied}</span>
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Rooms Table */}
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Room No.
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Camp
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                        </th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {sortedRooms.length === 0 ? (
                        <tr>
                            <td
                                colSpan="5"
                                className="px-6 py-8 text-center text-gray-500"
                            >
                                No rooms available. Add your first room to get
                                started.
                            </td>
                        </tr>
                    ) : (
                        sortedRooms.map((room) => (
                            <tr key={room._id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {room.roomNumber}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {getCampName(room.camp)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                                    {room.type}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <Badge
                                        className={getStatusClass(
                                            room.status,
                                        )}
                                    >
                                        <span className="capitalize">
                                            {room.status || 'available'}
                                        </span>
                                    </Badge>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <Button
                                        icon={<HiOutlinePencil />}
                                        size="sm"
                                        variant="subtle"
                                        onClick={() => onEdit(room)}
                                        className="mr-2"
                                    />
                                    <Button
                                        icon={<HiOutlineTrash />}
                                        size="sm"
                                        variant="subtle"
                                        color="red-600"
                                        onClick={() => onDelete(room._id)}
                                    />
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
            </div>
        </div>
    )
}

export default RoomsList
