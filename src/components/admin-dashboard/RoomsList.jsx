// src/components/admin-dashboard/RoomsList.jsx
import { Badge, Button } from '@/components/ui'
import React from 'react'
import { HiOutlinePencil, HiOutlineTrash } from 'react-icons/hi'

const RoomsList = ({ rooms, onEdit, onDelete, camps }) => {
    // Sort rooms by creation date (latest first)
    const sortedRooms = Array.isArray(rooms)
        ? [...rooms].sort(
              (a, b) =>
                  new Date(b.createdAt || b.updatedAt || 0) -
                  new Date(a.createdAt || a.updatedAt || 0),
          )
        : []

    const getStatusClass = (isAvailable) => {
        return isAvailable
            ? 'bg-green-100 text-green-800'
            : 'bg-red-100 text-red-800'
    }

    const getCampName = (campId) => {
        const camp = camps.find((c) => c._id === campId)
        return camp ? camp.name : 'Unknown Camp'
    }

    return (
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
                            Price/Night
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
                                colSpan="6"
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
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    ${room.price}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <Badge
                                        className={getStatusClass(
                                            room.isAvailable,
                                        )}
                                    >
                                        {room.isAvailable
                                            ? 'Available'
                                            : 'Unavailable'}
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
    )
}

export default RoomsList
