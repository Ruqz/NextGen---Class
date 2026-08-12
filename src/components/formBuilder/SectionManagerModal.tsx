import React, { useState } from 'react';
import { FormSection } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { X, Plus, Trash2, ArrowUp, ArrowDown, FolderPlus } from 'lucide-react';

interface SectionManagerModalProps {
  sections: FormSection[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (sections: FormSection[]) => void;
}

export const SectionManagerModal: React.FC<SectionManagerModalProps> = ({
  sections,
  isOpen,
  onClose,
  onSave,
}) => {
  if (!isOpen) return null;

  const [list, setList] = useState<FormSection[]>([...sections]);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    const newSec: FormSection = {
      id: `sec_${Date.now()}`,
      title: newTitle.trim(),
      description: newDesc.trim() || undefined,
      order: list.length + 1,
    };
    setList([...list, newSec]);
    setNewTitle('');
    setNewDesc('');
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;

    const newList = [...list];
    const temp = newList[index];
    newList[index] = newList[targetIdx];
    newList[targetIdx] = temp;

    // reindex order
    const reordered = newList.map((sec, idx) => ({ ...sec, order: idx + 1 }));
    setList(reordered);
  };

  const handleDelete = (id: string) => {
    if (list.length <= 1) return;
    setList(list.filter((s) => s.id !== id).map((sec, idx) => ({ ...sec, order: idx + 1 })));
  };

  const handleUpdate = (id: string, field: 'title' | 'description', val: string) => {
    setList(
      list.map((s) => (s.id === id ? { ...s, [field]: val } : s))
    );
  };

  const handleSave = () => {
    onSave(list);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-8">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-orange-400" /> Manage Form Sections
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Create, rename, or reorder logical sections in your application form.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section List */}
        <div className="p-6 space-y-4 max-h-[55vh] overflow-y-auto">
          <div className="space-y-3">
            {list.map((sec, idx) => (
              <div
                key={sec.id}
                className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 relative"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-mono font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-md">
                    Sec {idx + 1}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleMove(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded cursor-pointer disabled:opacity-20"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMove(idx, 'down')}
                      disabled={idx === list.length - 1}
                      className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded cursor-pointer disabled:opacity-20"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(sec.id)}
                      disabled={list.length <= 1}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer disabled:opacity-20"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <input
                  type="text"
                  value={sec.title}
                  onChange={(e) => handleUpdate(sec.id, 'title', e.target.value)}
                  placeholder="Section Title"
                  className="w-full text-xs font-bold p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500"
                />

                <input
                  type="text"
                  value={sec.description || ''}
                  onChange={(e) => handleUpdate(sec.id, 'description', e.target.value)}
                  placeholder="Section Subtitle / Description (Optional)"
                  className="w-full text-[11px] text-slate-600 p-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>
            ))}
          </div>

          {/* Add New Section */}
          <div className="pt-4 border-t border-slate-200 space-y-2">
            <h4 className="text-xs font-bold text-slate-900">Add New Section</h4>
            <div className="grid grid-cols-1 gap-2">
              <Input
                placeholder="New Section Title (e.g. 6. Emergency Contacts)"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="text-xs"
              />
              <Input
                placeholder="Description / Subtitle (Optional)"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="text-xs"
              />
              <Button variant="outline" size="sm" onClick={handleAdd} type="button" className="w-full mt-1">
                <Plus className="w-4 h-4" /> Add Section to Form
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <Button variant="outline" size="sm" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave} type="button">
            Save Section Changes
          </Button>
        </div>
      </div>
    </div>
  );
};
