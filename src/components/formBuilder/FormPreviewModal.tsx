import React from 'react';
import { FormField, FormSection } from '../../types';
import { DynamicFormRenderer } from './DynamicFormRenderer';
import { X, Eye } from 'lucide-react';

interface FormPreviewModalProps {
  fields: FormField[];
  sections: FormSection[];
  isOpen: boolean;
  onClose: () => void;
  formTitle: string;
}

export const FormPreviewModal: React.FC<FormPreviewModalProps> = ({
  fields,
  sections,
  isOpen,
  onClose,
  formTitle,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-100 w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-8 max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-orange-400" />
            <div>
              <h3 className="text-base font-bold">Form Preview Mode: {formTitle}</h3>
              <p className="text-xs text-slate-400">
                Interactive preview as experienced by applicants (conditional rules & file uploads active).
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto">
          <DynamicFormRenderer
            fields={fields}
            sections={sections}
            isPreviewMode={true}
            onSubmit={() => {}}
          />
        </div>
      </div>
    </div>
  );
};
