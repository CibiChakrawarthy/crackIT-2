import { create } from 'zustand';

export interface Message {
  id: string;
  type: 'question' | 'answer';
  text: string;
  timestamp: Date;
}

interface InterviewContext {
  resumeText: string;
  role: string;
  domain: string;
  interviewType: string;
  scheduledTime: 'immediately' | string;
}

interface InterviewState {
  isListening: boolean;
  messages: Message[];
  isModalOpen: boolean;
  isFloatingMode: boolean;
  interviewContext: InterviewContext | null;
  setIsListening: (isListening: boolean) => void;
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  clearMessages: () => void;
  setModalOpen: (isOpen: boolean) => void;
  setFloatingMode: (isFloating: boolean) => void;
  setInterviewContext: (context: InterviewContext) => void;
}

export const useInterviewStore = create<InterviewState>((set) => ({
  isListening: false,
  messages: [],
  isModalOpen: false,
  isFloatingMode: true,
  interviewContext: null,
  setIsListening: (isListening) => set({ isListening }),
  addMessage: (message) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          ...message,
          id: crypto.randomUUID(),
          timestamp: new Date(),
        },
      ],
    })),
  clearMessages: () => set({ messages: [] }),
  setModalOpen: (isOpen) => set({ isModalOpen: isOpen }),
  setFloatingMode: (isFloating) => set({ isFloatingMode: isFloating }),
  setInterviewContext: (context) => set({ interviewContext: context }),
}));