// src/components/admin-dashboard/AdminDashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import { toggleAdminPanel } from '@/store/theme/themeSlice';
import { Button } from '@/components/ui';
import { HiOutlinePlus, HiArrowLeft } from 'react-icons/hi';
import { useCamps } from "../../hooks/useCamps";
import { useRooms } from "../../hooks/useRooms";

import Sidebar from './Sidebar';
import CampsList from './CampsList';
import RoomsList from './RoomsList';
import CampForm from './CampForm';
import RoomForm from './RoomForm';
import DialogWrapper from './DialogWrapper';
import LoaderOverlay from './LoaderOverlay';
import UserForm from './UserForm';
import { userApi } from '@/services/userApi';

const getInitialFormData = (tab) => {
  if (tab === 'camps') {
    return {
      type: 'camp',
      name: '',
      location: '',
      description: '',
      image: '',
      totalRooms: '',
      occupiedRooms: '',
      status: 'active',
      id: undefined,
    };
  }
  if (tab === 'users') {
    return {
      name: '',
      email: '',
      password: '',
      role: 'user',
    };
  }
  return {
    type: 'room',
    campId: '',
    roomNumber: '',
    roomType: 'single',
    capacity: '',
    pricePerNight: '',
    status: 'available',
    amenities: [],
    description: '',
    id: undefined,
  };
};

const AdminDashboard = () => {
  const dispatch = useAppDispatch();
  const { 
    camps, 
    loading: campsLoading, 
    addCamp, 
    updateCamp, 
    deleteCamp 
  } = useCamps();
  
  const { 
    rooms, 
    loading: roomsLoading, 
    addRoom, 
    updateRoom, 
    deleteRoom 
  } = useRooms();
  
  const [activeTab, setActiveTab] = useState('camps');
  const [userMessage, setUserMessage] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(getInitialFormData('camps'));
  const [errors, setErrors] = useState({});
  const adminPanelOpen = useAppSelector((state) => state.theme.adminPanelOpen);

  const isLoading = campsLoading || roomsLoading;
  
  // Debug: Log the camps data to check its structure
  useEffect(() => {
    console.log('Camps data:', camps);
  }, [camps]);

  useEffect(() => {
    document.body.style.overflow = adminPanelOpen ? 'hidden' : 'auto';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [adminPanelOpen]);

  useEffect(() => {
    setFormData(getInitialFormData(activeTab));
    setErrors({});
    setUserMessage('');
  }, [activeTab]);

  const validateField = useCallback((name, value) => {
    const errs = { ...errors };
    switch (name) {
      case 'name':
      case 'roomNumber':
        if (!value?.toString().trim()) errs[name] = 'Required';
        else delete errs[name];
        break;
      case 'location':
        if (activeTab === 'camps' && !value?.toString().trim()) errs.location = 'Required';
        else delete errs.location;
        break;
      case 'totalRooms':
      case 'occupiedRooms':
        if (activeTab === 'camps') {
          const num = Number(value);
          if (isNaN(num) || num < 0) errs[name] = 'Must be ≥ 0';
          else if (name === 'occupiedRooms' && Number(formData.totalRooms) >= 0 && num > Number(formData.totalRooms)) {
            errs[name] = 'Cannot exceed total rooms';
          } else delete errs[name];
        }
        break;
      case 'capacity':
      case 'pricePerNight':
        if (activeTab === 'rooms') {
          const num = Number(value);
          if (isNaN(num) || num < 0) errs[name] = 'Must be ≥ 0';
          else delete errs[name];
        }
        break;
      case 'campId':
        if (activeTab === 'rooms' && !value) errs.campId = 'Please select a camp';
        else delete errs.campId;
        break;
      default:
        break;
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [activeTab, formData, errors]);

  const validateForm = useCallback(() => {
    const fields = activeTab === 'camps' ? ['name', 'location', 'totalRooms', 'occupiedRooms'] : ['campId', 'roomNumber', 'capacity', 'pricePerNight'];
    return fields.every(field => validateField(field, formData[field]));
  }, [activeTab, formData, validateField]);

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    const val = type === 'number' ? value : value;
    setFormData((prev) => ({ ...prev, [name]: val }));
  };

  const handleSelectChange = useCallback((name) => (e) => {
    const val = e?.target?.value ?? e;
    setFormData((prev) => ({ ...prev, [name]: val }));
    validateField(name, val);
  }, [validateField]);

  const handleAmenityChange = useCallback((amenity, checked) => {
    setFormData((prev) => {
      const setA = new Set(prev.amenities || []);
      checked ? setA.add(amenity) : setA.delete(amenity);
      return { ...prev, amenities: Array.from(setA) };
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUserMessage('');
    console.log('Form submitted', { formData, isEditing, activeTab });
    // Validate form
    const validationErrors = {};
    Object.keys(formData).forEach((key) => {
      if (key !== 'id' && !formData[key] && key !== 'image' && key !== 'rating' && key !== 'status' && key !== 'totalRooms' && key !== 'occupiedRooms') {
        validationErrors[key] = 'This field is required';
      }
    });
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    try {
      if (activeTab === 'users') {
        await userApi.create(formData);
        setUserMessage('User created successfully!');
        setFormData(getInitialFormData('users'));
        setErrors({});
        return;
      }
      if (isEditing) {
        if (activeTab === 'camps') {
          const campData = {
            name: formData.name,
            location: formData.location,
            description: formData.description,
            price: Number(formData.price) || 0,
            image: formData.image || '',
            rating: Number(formData.rating) || 0,
            status: formData.status || 'active',
            totalRooms: Number(formData.totalRooms) || 0,
            occupiedRooms: Number(formData.occupiedRooms) || 0
          };
          await updateCamp(formData._id || formData.id, campData);
        } else {
          await updateRoom(formData._id || formData.id, formData);
        }
      } else {
        if (activeTab === 'camps') {
          const campData = {
            name: formData.name,
            location: formData.location,
            description: formData.description,
            price: Number(formData.price) || 0,
            image: formData.image || '',
            rating: Number(formData.rating) || 0,
            status: formData.status || 'active',
            totalRooms: Number(formData.totalRooms) || 0,
            occupiedRooms: Number(formData.occupiedRooms) || 0
          };
          await addCamp(campData);
        } else {
          await addRoom(formData);
        }
      }
      setIsOpen(false);
      setFormData(getInitialFormData(activeTab));
      setErrors({});
    } catch (error) {
      if (activeTab === 'users') {
        setUserMessage(error?.response?.data?.error || 'Failed to create user');
      } else {
        alert(`Failed to ${isEditing ? 'update' : 'create'} ${activeTab.slice(0, -1)}. Please check the console for details.`);
      }
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    setIsLoading(true);
    try {
      if (activeTab === 'camps') {
        await deleteCamp(id);
        setCamps(camps.filter((c) => c.id !== id));
      } else {
        await dispatch(removeRoom(id));
      }
      toast.push(<Notification title="Success" type="success">{`${activeTab.slice(0, -1)} deleted`} successfully</Notification>);
    } catch (err) {
      console.error(`Error deleting ${activeTab.slice(0, -1)}:`, err);
      toast.push(<Notification title="Error" type="danger">{err.message || `Failed to delete ${activeTab.slice(0, -1)}`}</Notification>);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddNew = () => {
    setFormData(getInitialFormData(activeTab));
    setIsEditing(false);
    setIsOpen(true);
    setErrors({});
  };

  const handleEdit = (item) => {
    // Map the API response to match the form data structure
    const formData = {
      ...item,
      id: item._id, // Map _id to id for the form
      // Add any other necessary mappings here
    };
    setFormData(formData);
    setIsEditing(true);
    setIsOpen(true);
    setErrors({});
  };

  if (!adminPanelOpen) return null;

  const getClass = (field) => (errors[field] ? 'border-red-500 focus:border-red-500' : '');

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="w-64 bg-white h-full shadow-lg">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
      <div className="flex-1 bg-gray-100 h-full overflow-y-auto relative">
        <div className="p-6">
          <button
            onClick={() => dispatch(toggleAdminPanel())}
            className="absolute top-0 left-0 flex items-center text-slate-800 text-xl z-50 hover:bg-gray-100 p-2 rounded-full transition-colors"
          >
            <HiArrowLeft className="mr-1" />
          </button> 
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold capitalize">{activeTab}</h1>
            {activeTab !== 'users' && (
              <Button icon={<HiOutlinePlus />} variant="solid" onClick={handleAddNew}>
                Add New {activeTab.slice(0, -1)}
              </Button>
            )}
          </div>
          <div className="relative">
            <LoaderOverlay isLoading={isLoading || roomsLoading} />
            {activeTab === 'camps' ? (
              <CampsList camps={camps} onEdit={handleEdit} onDelete={handleDelete} />
            ) : activeTab === 'rooms' ? (
              <RoomsList rooms={rooms} camps={camps} onEdit={handleEdit} onDelete={handleDelete} />
            ) : (
              <div>
                <UserForm onSubmit={async (userData) => {
                  setUserMessage('');
                  try {
                    await userApi.create(userData);
                    setUserMessage('User created successfully!');
                  } catch (err) {
                    setUserMessage(err?.response?.data?.error || 'Failed to create user');
                  }
                }} />
                {userMessage && <div style={{ color: userMessage.includes('success') ? 'green' : 'red', marginTop: 12 }}>{userMessage}</div>}
              </div>
            )}
          </div>
        </div>
      </div>
      <DialogWrapper
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={`${isEditing ? 'Edit' : 'Add'} ${activeTab.slice(0, -1)}`}
        onConfirm={handleSubmit}
        isLoading={isLoading}
      >
        {activeTab === 'camps' ? (
          <CampForm
            formData={formData}
            errors={errors}
            handleInputChange={handleInputChange}
            handleSelectChange={handleSelectChange}
            validateField={validateField}
            getClass={getClass}
          />
        ) : (
          <RoomForm
            formData={formData}
            errors={errors}
            camps={camps}
            handleInputChange={handleInputChange}
            handleSelectChange={handleSelectChange}
            handleAmenityChange={handleAmenityChange}
            validateField={validateField}
            getClass={getClass}
          />
        )}
      </DialogWrapper>
    </div>
  );
};

export default AdminDashboard;
