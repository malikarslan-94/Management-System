import React from 'react';
import { Button, Badge } from '@/components/ui';
import { HiOutlinePencil, HiOutlineTrash } from 'react-icons/hi';

const CampsList = ({ camps, onEdit, onDelete }) => {
  if (!camps?.length) return <div>No camps available</div>;

  const getStatusClass = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
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
          {camps.map((camp) => (
            <tr key={camp._id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">{camp.name}</td>
              <td className="px-6 py-4 whitespace-nowrap">{camp.location}</td>
              <td className="px-6 py-4 whitespace-nowrap">
                {camp.occupiedRooms || 0} / {camp.totalRooms || 0}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <Badge className={getStatusClass(camp.status)}>{camp.status || 'inactive'}</Badge>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button onClick={() => onEdit(camp)} className="text-blue-600 hover:text-blue-900 mr-4">
                  <HiOutlinePencil className="h-5 w-5" />
                </button>
                <button onClick={() => onDelete(camp._id)} className="text-red-600 hover:text-red-900">
                  <HiOutlineTrash className="h-5 w-5" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CampsList;
