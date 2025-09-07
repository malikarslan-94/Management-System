// src/components/admin-dashboard/CampsList.jsx
import React from 'react';
import { Button, Badge } from '@/components/ui';
import { HiOutlinePencil, HiOutlineTrash } from 'react-icons/hi';

const CampsList = ({ camps, onEdit, onDelete }) => {
  const getStatusClass = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rooms (Occupied/Total)</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {!Array.isArray(camps) ? (
            <tr>
              <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">
                No camps available
              </td>
            </tr>
          ) : camps.map((camp) => (
            <tr key={camp._id || camp.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{camp.name}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{camp.location}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {camp.occupiedRooms || 0} / {camp.totalRooms || 0}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <Badge className={getStatusClass(camp.status || 'active')}>
                  {camp.status || 'active'}
                </Badge>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <Button icon={<HiOutlinePencil />} size="sm" variant="subtle" onClick={() => onEdit(camp)} className="mr-2" />
                <Button icon={<HiOutlineTrash />} size="sm" variant="subtle" color="red-600" onClick={() => onDelete(camp.id)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CampsList;
