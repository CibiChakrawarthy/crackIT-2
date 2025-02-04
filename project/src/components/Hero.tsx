import React from 'react';
import { Mic, MessageSquare, Zap } from 'lucide-react';
import { useInterviewStore } from '../lib/store';

export function Hero() {
  const { setModalOpen } = useInterviewStore();

  return (
    <div className="bg-gradient-to-b from-indigo-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
            Ace Your Next
            <span className="text-indigo-600"> Interview</span>
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            Get real-time AI assistance during interviews. Professional, personalized responses powered by advanced language models.
          </p>
          <div className="mt-8">
            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 md:py-4 md:text-lg md:px-10 transition-colors duration-200"
            >
              <Mic className="w-5 h-5 mr-2" />
              Start Interview Assistant
            </button>
          </div>
        </div>

        <div className="mt-20 grid grid-cols-1 gap-12 sm:grid-cols-3 sm:gap-x-8">
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative bg-white p-6 rounded-lg shadow-sm">
              <div className="flex justify-center mb-4">
                <Mic className="h-8 w-8 text-indigo-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Voice Recognition</h3>
              <p className="text-gray-600">
                Automatically captures interviewer questions in real-time with advanced speech recognition
              </p>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative bg-white p-6 rounded-lg shadow-sm">
              <div className="flex justify-center mb-4">
                <MessageSquare className="h-8 w-8 text-indigo-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Smart Responses</h3>
              <p className="text-gray-600">
                Generates tailored responses based on your resume and experience using AI technology
              </p>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative bg-white p-6 rounded-lg shadow-sm">
              <div className="flex justify-center mb-4">
                <Zap className="h-8 w-8 text-indigo-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Real-Time Support</h3>
              <p className="text-gray-600">
                Get instant, contextual assistance during your interview with our floating widget
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}