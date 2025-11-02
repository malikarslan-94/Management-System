import { Badge, Button } from '@/components/ui'
import React from 'react'
import { HiOutlineX } from 'react-icons/hi'

const EmployeeDetail = ({ employee, onClose }) => {
    if (!employee) return null

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

    const formatDate = (date) => {
        if (!date) return 'N/A'
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        })
    }

    const roomHistory = employee.roomAssignmentHistory || []

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900">
                        Employee Details
                    </h2>
                    <Button
                        icon={<HiOutlineX />}
                        variant="plain"
                        size="sm"
                        onClick={onClose}
                    >
                        Close
                    </Button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* Employee Info */}
                    <div className="grid grid-cols-2 gap-6 mb-8">
                        <div>
                            <div className="flex items-center mb-4">
                                <div className="flex-shrink-0 h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center mr-4">
                                    <span className="text-blue-600 font-bold text-xl">
                                        {employee.firstName
                                            ?.charAt(0)
                                            .toUpperCase() || 'E'}
                                        {employee.lastName
                                            ?.charAt(0)
                                            .toUpperCase() || ''}
                                    </span>
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold text-gray-900">
                                        {employee.firstName} {employee.lastName}
                                    </h3>
                                    {employee.designation && (
                                        <p className="text-sm text-gray-500">
                                            {employee.designation}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div>
                                    <span className="text-sm font-medium text-gray-500">
                                        Email:
                                    </span>
                                    <p className="text-sm text-gray-900">
                                        {employee.email}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-sm font-medium text-gray-500">
                                        Phone:
                                    </span>
                                    <p className="text-sm text-gray-900">
                                        {employee.phone}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-sm font-medium text-gray-500">
                                        Department:
                                    </span>
                                    <p className="text-sm text-gray-900">
                                        {employee.department || 'N/A'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <div className="space-y-4">
                                <div>
                                    <span className="text-sm font-medium text-gray-500 block mb-2">
                                        Employee Type:
                                    </span>
                                    <Badge
                                        className={getEmployeeTypeClass(
                                            employee.employeeType,
                                        )}
                                    >
                                        {employee.employeeType || 'Permanent'}
                                    </Badge>
                                </div>
                                <div>
                                    <span className="text-sm font-medium text-gray-500 block mb-2">
                                        Status:
                                    </span>
                                    <Badge
                                        className={getStatusClass(
                                            employee.status,
                                        )}
                                    >
                                        {employee.status || 'Inactive'}
                                    </Badge>
                                </div>
                                <div>
                                    <span className="text-sm font-medium text-gray-500">
                                        Camp:
                                    </span>
                                    <p className="text-sm text-gray-900">
                                        {typeof employee.campId === 'object' &&
                                        employee.campId
                                            ? employee.campId.name
                                            : employee.campId_details?.name ||
                                              (typeof employee.campId ===
                                              'string'
                                                  ? employee.campId
                                                  : 'Not assigned')}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-sm font-medium text-gray-500">
                                        Current Room:
                                    </span>
                                    <p className="text-sm text-gray-900">
                                        {typeof employee.currentRoomId ===
                                            'object' && employee.currentRoomId
                                            ? employee.currentRoomId.roomNumber
                                            : employee.currentRoomId_details
                                                  ?.roomNumber ||
                                              (typeof employee.currentRoomId ===
                                              'string'
                                                  ? employee.currentRoomId
                                                  : 'Not assigned')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Room Assignment History */}
                    <div className="border-t border-gray-200 pt-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Room Assignment History
                        </h3>
                        {roomHistory.length === 0 ? (
                            <p className="text-sm text-gray-500">
                                No room assignment history available.
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Room Number
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Room Type
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Start Date
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                End Date
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Status
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {roomHistory.map(
                                            (assignment, index) => {
                                                const isActive =
                                                    !assignment.endDate
                                                const roomInfo =
                                                    assignment.roomId_details ||
                                                    assignment.roomId

                                                return (
                                                    <tr
                                                        key={
                                                            assignment._id ||
                                                            index
                                                        }
                                                        className={
                                                            isActive
                                                                ? 'bg-blue-50'
                                                                : ''
                                                        }
                                                    >
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                            {typeof roomInfo ===
                                                            'object'
                                                                ? roomInfo?.roomNumber ||
                                                                  'N/A'
                                                                : roomInfo ||
                                                                  'N/A'}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                                                            {typeof roomInfo ===
                                                            'object'
                                                                ? roomInfo?.type ||
                                                                  'N/A'
                                                                : '-'}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {formatDate(
                                                                assignment.startDate,
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {assignment.endDate
                                                                ? formatDate(
                                                                      assignment.endDate,
                                                                  )
                                                                : 'Current'}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <Badge
                                                                className={
                                                                    isActive
                                                                        ? 'bg-green-100 text-green-800'
                                                                        : 'bg-gray-100 text-gray-800'
                                                                }
                                                            >
                                                                {isActive
                                                                    ? 'Active'
                                                                    : 'Completed'}
                                                            </Badge>
                                                        </td>
                                                    </tr>
                                                )
                                            },
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default EmployeeDetail
