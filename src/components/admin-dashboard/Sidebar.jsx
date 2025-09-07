// src/components/admin-dashboard/Sidebar.jsx
import React from 'react';
import { Button } from '@/components/ui';
import { HiOutlineHome, HiOutlineOfficeBuilding, HiOutlineUser } from 'react-icons/hi';

const Sidebar = ({ activeTab, onTabChange }) => {
  const getButtonClass = (tabName) => {
    return `w-full justify-start mb-2 ${activeTab === tabName ? 'bg-gray-200' : ''}`;
  };

  return (
    <div className="p-4 bg-gray-50 h-full">
      <h2 className="text-lg font-semibold mb-4">Admin Menu</h2>
      <Button
        variant="subtle"
        icon={<HiOutlineHome />}
        className={getButtonClass('camps')}
        onClick={() => onTabChange('camps')}
      >
        Camps
      </Button>
      <Button
        variant="subtle"
        icon={<HiOutlineOfficeBuilding />}
        className={getButtonClass('rooms')}
        onClick={() => onTabChange('rooms')}
      >
        Rooms
      </Button>
      <Button
        variant="subtle"
        icon={<HiOutlineUser />}
        className={getButtonClass('users')}
        onClick={() => onTabChange('users')}
      >
        Users
      </Button>
    </div>
  );
};

export default Sidebar;
