import React from 'react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { InterviewModal } from './components/InterviewModal';
import { InterviewAssistant } from './components/InterviewAssistant';

function App() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main>
        <Hero />
        <InterviewModal />
        <InterviewAssistant />
      </main>
    </div>
  );
}

export default App;