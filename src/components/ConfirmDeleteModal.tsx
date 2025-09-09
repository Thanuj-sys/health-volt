import React from 'react';
import { motion } from 'framer-motion';
import { Button, Modal } from './ui';

interface ConfirmDeleteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    recordName: string;
}

const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    recordName
}) => {
    const handleConfirm = () => {
        onConfirm();
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <div className="text-center">
                {/* Warning Icon */}
                <div className="mx-auto flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-6">
                    <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                    Delete Medical Record
                </h3>

                {/* Message */}
                <p className="text-slate-600 mb-2">
                    Are you sure you want to delete the following record?
                </p>
                
                <div className="bg-slate-50 rounded-lg p-3 mb-6">
                    <p className="font-semibold text-slate-900 break-words">
                        "{recordName}"
                    </p>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
                    <p className="text-red-700 text-sm font-medium">
                        ⚠️ This action cannot be undone. The file will be permanently deleted from your medical records.
                    </p>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 justify-center">
                    <Button
                        onClick={onClose}
                        variant="outline"
                        className="px-6 py-2 border-slate-300 text-slate-700 hover:bg-slate-50"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        variant="destructive"
                        className="px-6 py-2"
                    >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete Record
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default ConfirmDeleteModal;
