// src/components/admin-dashboard/CampForm.jsx
import React, { useEffect, useState } from 'react';
import { FormContainer, FormItem, Input, Select } from '@/components/ui';
import { locationApi } from '@/services/api';
import CampStructureFields from './CampStructureFields';

/**
 * Room totals are no longer editable here — camps report live counts from the
 * API, so a hand-typed figure could only ever be wrong.
 *
 * When creating, this mirrors the Locations & Camps flow exactly: pick a real
 * location, then declare the camp's structure so it can accept rooms straight
 * away. On edit the structure section is hidden — buildings are added and
 * removed individually once a camp exists.
 */
const CampForm = ({
  formData,
  errors,
  isEditing,
  handleInputChange,
  handleSelectChange,
  setFieldValue,
  validateField,
  getClass,
}) => {
  const [locations, setLocations] = useState([]);
  const [locationsLoading, setLocationsLoading] = useState(true);

  useEffect(() => {
    locationApi
      .getAll()
      .then((res) => setLocations(Array.isArray(res.data) ? res.data : []))
      .catch(() => setLocations([]))
      .finally(() => setLocationsLoading(false));
  }, []);

  return (
    <FormContainer layout="vertical" size="sm">
      <FormItem label="Name" required>
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

      {/* A camp must point at a real Location document — free text used to
          create phantom locations that existed only in one browser. */}
      <FormItem label="Location" required>
        <Select
          value={formData.locationId || ''}
          onChange={handleSelectChange('locationId')}
          className="w-full"
          disabled={locationsLoading}
        >
          <option value="">
            {locationsLoading ? 'Loading locations...' : 'Select a location'}
          </option>
          {locations.map((loc) => (
            <option key={loc._id} value={loc._id}>
              {loc.name}
            </option>
          ))}
        </Select>
        {!locationsLoading && locations.length === 0 && (
          <div className="text-xs text-red-500 mt-1">
            No locations yet. Add one under Locations &amp; camps first.
          </div>
        )}
        {errors.locationId && <div className="text-xs text-red-600">{errors.locationId}</div>}
      </FormItem>

      <FormItem label="Base price">
        <Input
          type="number"
          name="price"
          value={formData.price}
          onChange={handleInputChange}
          min="0"
          className={`w-full ${getClass('price')}`}
        />
        {errors.price && <div className="text-xs text-red-600">{errors.price}</div>}
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

      {!isEditing && (
        <>
          <CampStructureFields
            structure={{
              mode: formData.structureMode || 'single',
              singleFloors: formData.singleFloors || '1',
              rows: formData.buildingRows || [],
            }}
            onChange={(patch) => {
              if (patch.mode !== undefined) setFieldValue('structureMode', patch.mode);
              if (patch.singleFloors !== undefined) setFieldValue('singleFloors', patch.singleFloors);
              if (patch.rows !== undefined) setFieldValue('buildingRows', patch.rows);
            }}
          />
          {errors.buildingRows && (
            <div className="text-xs text-red-600 mt-1">{errors.buildingRows}</div>
          )}
        </>
      )}
    </FormContainer>
  );
};

export default CampForm;
