// src/components/admin-dashboard/RoomsList.jsx
import React from 'react';
import { Button, Badge } from '@/components/ui';
import { HiOutlinePencil, HiOutlineTrash } from 'react-icons/hi';

const RoomsList = ({ rooms, onEdit, onDelete, camps }) => {
  const getStatusClass = (status) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'occupied':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCampName = (campId) => {
    const camp = camps.find(c => c.id === campId);
    return camp ? camp.name : 'Unknown Camp';
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room No.</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Camp</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price/Night</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {Array.isArray(rooms) && rooms.map((room) => (
            <tr key={room.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{room.roomNumber}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{getCampName(room.campId)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{room.roomType}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${room.pricePerNight}</td>
              <td className="px-6 py-4 whitespace-nowrap">
                <Badge className={getStatusClass(room.status)}>{room.status}</Badge>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <Button icon={<HiOutlinePencil />} size="sm" variant="subtle" onClick={() => onEdit(room)} className="mr-2" />
                <Button icon={<HiOutlineTrash />} size="sm" variant="subtle" color="red-600" onClick={() => onDelete(room.id)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RoomsList;
