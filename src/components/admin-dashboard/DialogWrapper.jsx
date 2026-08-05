// src/components/admin-dashboard/DialogWrapper.jsx
import React from 'react';
import { Button } from '@/components/ui';
import LoaderOverlay from './LoaderOverlay';
import { HiOutlineSave, HiX } from 'react-icons/hi';

const DialogWrapper = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  onConfirm,
  isLoading,
  confirmLabel = 'Save',
  loadingLabel = 'Saving...',
  confirmDisabled = false,
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-20">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-xl relative max-h-[calc(100vh-6rem)] overflow-y-auto">
        {isLoading && <LoaderOverlay />}
        
        <div className="p-4 border-b flex justify-between items-start sticky top-0 bg-white z-10">
          <div>
            <h3 className="text-lg font-medium">{title}</h3>
            {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
          </div>
          <button onClick={onClose} disabled={isLoading} className="text-gray-400 hover:text-gray-600">
            <HiX className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          {children}
        </div>

        <div className="px-4 py-3 bg-gray-50 text-right sticky bottom-0 z-10">
          <Button type="button" variant="plain" onClick={onClose} className="mr-2" disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="solid"
            icon={<HiOutlineSave />}
            onClick={onConfirm}
            disabled={isLoading || confirmDisabled}
          >
            {isLoading ? loadingLabel : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DialogWrapper;
