// src/components/admin-dashboard/CampForm.jsx
import React from 'react';
import { FormContainer, FormItem, Input, Select } from '@/components/ui';

const CampForm = ({ formData, errors, handleInputChange, handleSelectChange, validateField, getClass }) => {
  return (
    <FormContainer layout="vertical" size="sm">
      <FormItem label="Name">
        <Input
          name="name"
          value={formData.name}
          onChange={handleInputChange}
          onBlur={e => validateField('name', e.target.value)}
          className={`w-full ${getClass('name')}`}
          required
        />
        {errors.name && <div className="text-xs text-red-600">{errors.name}</div>}
      </FormItem>
      <FormItem label="Location">
        <Input
          name="location"
          value={formData.location}
          onChange={handleInputChange}
          onBlur={e => validateField('location', e.target.value)}
          className={`w-full ${getClass('location')}`}
          required
        />
        {errors.location && <div className="text-xs text-red-600">{errors.location}</div>}
      </FormItem>
      <FormItem label="Total Rooms">
        <Input
          type="number"
          name="totalRooms"
          value={formData.totalRooms}
          onChange={handleInputChange}
          onBlur={e => validateField('totalRooms', e.target.value)}
          min="0"
          className={`w-full ${getClass('totalRooms')}`}
        />
        {errors.totalRooms && <div className="text-xs text-red-600">{errors.totalRooms}</div>}
      </FormItem>
      <FormItem label="Occupied Rooms">
        <Input
          type="number"
          name="occupiedRooms"
          value={formData.occupiedRooms}
          onChange={handleInputChange}
          onBlur={e => validateField('occupiedRooms', e.target.value)}
          min="0"
          max={formData.totalRooms || ''}
          disabled={!formData.totalRooms}
          className={`w-full ${getClass('occupiedRooms')}`}
        />
        {errors.occupiedRooms && <div className="text-xs text-red-600">{errors.occupiedRooms}</div>}
      </FormItem>
      <FormItem label="Status">
        <Select
          value={formData.status}
          onChange={handleSelectChange('status')}
          className="w-full"
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="maintenance">Under Maintenance</option>
        </Select>
      </FormItem>
      <FormItem label="Description">
        <textarea
          name="description"
          rows="3"
          value={formData.description}
          onChange={handleInputChange}
          className="w-full border-gray-300 rounded-md p-2"
          placeholder="Optional"
        />
      </FormItem>
    </FormContainer>
  );
};

export default CampForm;
