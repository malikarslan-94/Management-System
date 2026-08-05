import React from 'react';
import { Button, Badge } from '@/components/ui';
import { HiOutlineOfficeBuilding, HiOutlinePencil, HiOutlinePlus, HiOutlineTrash } from 'react-icons/hi';

/**
 * Room and building counts come straight from the API, which computes them per
 * request — there are no stored totals to drift out of date.
 */
const CampsList = ({ camps, onEdit, onDelete, onAddBuilding }) => {
  if (!camps?.length) return <div>No camps available</div>;

  const getStatusClass = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const locationName = (camp) =>
    typeof camp.locationId === 'object' && camp.locationId
      ? camp.locationId.name
      : camp.location || '—';

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Buildings</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rooms (Occupied/Total)</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {camps.map((camp) => (
            <tr key={camp._id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">{camp.name}</td>
              <td className="px-6 py-4 whitespace-nowrap">{locationName(camp)}</td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="inline-flex items-center text-gray-600">
                  <HiOutlineOfficeBuilding className="mr-1 h-4 w-4" />
                  {camp.buildingCount ?? 0}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {camp.occupiedRooms || 0} / {camp.totalRooms || 0}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <Badge className={getStatusClass(camp.status)}>{camp.status || 'inactive'}</Badge>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                {/* Same action as the camp cards on Locations & camps. */}
                <Button
                  size="xs"
                  variant="plain"
                  icon={<HiOutlinePlus />}
                  onClick={() => onAddBuilding(camp)}
                  className="mr-2"
                >
                  Building
                </Button>
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
