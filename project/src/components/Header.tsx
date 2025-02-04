import React from 'react';
import { Brain } from 'lucide-react';
import { useInterviewStore } from '../lib/store';

export function Header() {
  const { setModalOpen } = useInterviewStore();

  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Brain className="h-8 w-8 text-indigo-600" />
            <h1 className="text-xl font-semibold text-gray-900">Crackit</h1>
          </div>
          <nav className="flex space-x-4">
            <button className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900">
              Settings
            </button>
            <button
              onClick={() => setModalOpen(true)}
              className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Start Interview
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}