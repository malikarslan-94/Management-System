// src/components/admin-dashboard/RoomForm.jsx
import React from 'react';
import { FormContainer, FormItem, Input, Select, Checkbox } from '@/components/ui';

const RoomForm = ({ formData, errors, camps, handleInputChange, handleSelectChange, handleAmenityChange, validateField, getClass }) => {
  const AMENITIES = ['wifi', 'ac', 'tv', 'balcony', 'kitchen'];

  return (
    <FormContainer layout="vertical" size="sm">
      <FormItem label="Camp">
        <Select
          value={formData.campId}
          onChange={handleSelectChange('campId')}
          className={`w-full ${getClass('campId')}`}
        >
          <option value="">Select a camp</option>
          {camps.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        {errors.campId && <div className="text-xs text-red-600">{errors.campId}</div>}
      </FormItem>
      <FormItem label="Room Number">
        <Input
          name="roomNumber"
          value={formData.roomNumber}
          onChange={handleInputChange}
          onBlur={e => validateField('roomNumber', e.target.value)}
          className={`w-full ${getClass('roomNumber')}`}
          required
        />
        {errors.roomNumber && <div className="text-xs text-red-600">{errors.roomNumber}</div>}
      </FormItem>
      <FormItem label="Room Type">
        <Select
          value={formData.roomType}
          onChange={handleSelectChange('roomType')}
          className="w-full"
        >
          <option value="single">Single</option>
          <option value="double">Double</option>
          <option value="suite">Suite</option>
        </Select>
      </FormItem>
      <FormItem label="Capacity">
        <Input
          type="number"
          name="capacity"
          value={formData.capacity}
          onChange={handleInputChange}
          onBlur={e => validateField('capacity', e.target.value)}
          min="0"
          className={`w-full ${getClass('capacity')}`}
        />
        {errors.capacity && <div className="text-xs text-red-600">{errors.capacity}</div>}
      </FormItem>
      <FormItem label="Price Per Night">
        <Input
          type="number"
          name="pricePerNight"
          value={formData.pricePerNight}
          onChange={handleInputChange}
          onBlur={e => validateField('pricePerNight', e.target.value)}
          min="0"
          className={`w-full ${getClass('pricePerNight')}`}
        />
        {errors.pricePerNight && <div className="text-xs text-red-600">{errors.pricePerNight}</div>}
      </FormItem>
      <FormItem label="Status">
        <Select
          value={formData.status}
          onChange={handleSelectChange('status')}
          className="w-full"
        >
          <option value="available">Available</option>
          <option value="occupied">Occupied</option>
          <option value="maintenance">Maintenance</option>
        </Select>
      </FormItem>
      <FormItem label="Amenities">
        <div className="grid grid-cols-2 gap-2">
          {AMENITIES.map(amenity => (
            <Checkbox
              key={amenity}
              checked={formData.amenities?.includes(amenity)}
              onChange={checked => handleAmenityChange(amenity, checked)}
            >
              {amenity.charAt(0).toUpperCase() + amenity.slice(1)}
            </Checkbox>
          ))}
        </div>
      </FormItem>
    </FormContainer>
  );
};

export default RoomForm;
