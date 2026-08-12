import React from 'react';
import { Layers } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-400 text-xs border-t border-slate-800 py-10 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-orange-600 flex items-center justify-center text-white font-bold">
                <Layers className="w-4 h-4" />
              </div>
              <span className="font-bold text-sm text-white tracking-tight">
                NextGen <span className="text-orange-500">PRO</span>
              </span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              Reusable digital platform for managing education, skills development, and empowerment initiatives.
            </p>
          </div>

          <div>
            <h5 className="font-semibold text-white text-xs uppercase tracking-wider mb-3">
              Programmes
            </h5>
            <ul className="space-y-2">
              <li className="hover:text-white cursor-pointer">Generative AI & AI Automation</li>
              <li className="hover:text-white cursor-pointer">Practical AI for Productivity</li>
              <li className="hover:text-white cursor-pointer">Digital Literacy & Transformation</li>
              <li className="hover:text-white cursor-pointer">Vibe Coding & Modern Software</li>
            </ul>
          </div>

          <div>
            <h5 className="font-semibold text-white text-xs uppercase tracking-wider mb-3">
              Platform Areas
            </h5>
            <ul className="space-y-2">
              <li className="hover:text-white cursor-pointer">Public Catalogue & Applying</li>
              <li className="hover:text-white cursor-pointer">Learner Dashboard</li>
              <li className="hover:text-white cursor-pointer">Instructor Workspace</li>
              <li className="hover:text-white cursor-pointer">PM & M&E Analytics</li>
            </ul>
          </div>

          <div>
            <h5 className="font-semibold text-white text-xs uppercase tracking-wider mb-3">
              Security & Compliance
            </h5>
            <p className="text-slate-400 text-xs leading-relaxed mb-2">
              Secured with Firebase Authentication, Firestore security rules, and server-side validation.
            </p>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 text-slate-300 rounded border border-slate-700 text-[11px]">
              <span>🔒 Role-Based Access Control (RBAC)</span>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500">
          <p>© {new Date().getFullYear()} NextGen PRO Programme Management Platform. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="hover:text-slate-300 cursor-pointer">Privacy Policy</span>
            <span className="hover:text-slate-300 cursor-pointer">Terms of Service</span>
            <span className="hover:text-slate-300 cursor-pointer">Support</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
