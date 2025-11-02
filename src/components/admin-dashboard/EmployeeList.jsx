import { Badge } from '@/components/ui'
import React from 'react'
import { HiOutlineEye, HiOutlinePencil, HiOutlineTrash } from 'react-icons/hi'

const EmployeeList = ({ employees, onEdit, onDelete, onView }) => {
    if (!employees?.length)
        return (
            <div className="text-gray-500 py-8 text-center">
                No employees available
            </div>
        )

    const getStatusClass = (status) => {
        switch (status) {
            case 'Active':
                return 'bg-green-100 text-green-800'
            case 'Inactive':
                return 'bg-red-100 text-red-800'
            default:
                return 'bg-gray-100 text-gray-800'
        }
    }

    const getEmployeeTypeClass = (type) => {
        switch (type) {
            case 'Permanent':
                return 'bg-blue-100 text-blue-800'
            case 'Temporary':
                return 'bg-yellow-100 text-yellow-800'
            case 'Visitor':
                return 'bg-purple-100 text-purple-800'
            default:
                return 'bg-gray-100 text-gray-800'
        }
    }

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Phone
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Department
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Camp
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Room
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
                    {employees.map((employee) => (
                        <tr key={employee._id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                        <span className="text-blue-600 font-medium">
                                            {employee.firstName
                                                ?.charAt(0)
                                                .toUpperCase() || 'E'}
                                            {employee.lastName
                                                ?.charAt(0)
                                                .toUpperCase() || ''}
                                        </span>
                                    </div>
                                    <div className="ml-4">
                                        <div className="text-sm font-medium text-gray-900">
                                            {employee.firstName}{' '}
                                            {employee.lastName}
                                        </div>
                                        {employee.designation && (
                                            <div className="text-sm text-gray-500">
                                                {employee.designation}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {employee.email}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {employee.phone}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <Badge
                                    className={getEmployeeTypeClass(
                                        employee.employeeType,
                                    )}
                                >
                                    {employee.employeeType || 'Permanent'}
                                </Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {employee.department || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {typeof employee.campId === 'object' &&
                                employee.campId
                                    ? employee.campId.name
                                    : employee.campId_details?.name ||
                                      (typeof employee.campId === 'string'
                                          ? employee.campId
                                          : '-')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {typeof employee.currentRoomId === 'object' &&
                                employee.currentRoomId
                                    ? employee.currentRoomId.roomNumber
                                    : employee.currentRoomId_details
                                          ?.roomNumber ||
                                      (typeof employee.currentRoomId ===
                                      'string'
                                          ? employee.currentRoomId
                                          : '-')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <Badge
                                    className={getStatusClass(employee.status)}
                                >
                                    {employee.status || 'Inactive'}
                                </Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                {onView && (
                                    <button
                                        onClick={() => onView(employee)}
                                        className="text-blue-600 hover:text-blue-900 mr-4"
                                        title="View Details"
                                    >
                                        <HiOutlineEye className="h-5 w-5" />
                                    </button>
                                )}
                                <button
                                    onClick={() => onEdit(employee)}
                                    className="text-blue-600 hover:text-blue-900 mr-4"
                                    title="Edit"
                                >
                                    <HiOutlinePencil className="h-5 w-5" />
                                </button>
                                <button
                                    onClick={() => onDelete(employee._id)}
                                    className="text-red-600 hover:text-red-900"
                                    title="Delete"
                                >
                                    <HiOutlineTrash className="h-5 w-5" />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

export default EmployeeList
