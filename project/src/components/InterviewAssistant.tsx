import React, { useEffect, useRef, useState } from 'react';
import { Mic, Copy, Settings, Loader2, AlertCircle, Minimize2, Maximize2 } from 'lucide-react';
import { useInterviewStore } from '../lib/store';
import { TranscriptionService } from '../lib/transcription';
import { AIService } from '../lib/ai';

export function InterviewAssistant() {
  const {
    isListening,
    messages,
    setIsListening,
    addMessage,
    interviewContext,
    isFloatingMode,
    setFloatingMode
  } = useInterviewStore();

  const transcriptionRef = useRef<TranscriptionService | null>(null);
  const aiRef = useRef<AIService | null>(null);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState('');
  const [clarificationOptions, setClarificationOptions] = useState<string[] | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    // Initialize AI service
    aiRef.current = new AIService();

    // Set interview context when it changes
    if (aiRef.current && interviewContext) {
      aiRef.current.setInterviewContext(interviewContext);
    }

    // Initialize transcription service
    transcriptionRef.current = new TranscriptionService(async (text) => {
      setError(null);
      handleQuestion(text);
    });

    return () => {
      transcriptionRef.current?.stop();
    };
  }, [addMessage, messages, interviewContext]);

  const handleQuestion = async (text: string) => {
    addMessage({ type: 'question', text });
    setIsGenerating(true);
    setCurrentStreamingMessage('');
    setClarificationOptions(null);
    
    if (aiRef.current) {
      const context = messages.map(m => ({
        role: m.type === 'question' ? 'user' : 'assistant' as const,
        content: m.text,
      }));

      try {
        const response = await aiRef.current.generateResponse(
          text,
          context,
          (token) => {
            setCurrentStreamingMessage(prev => prev + token);
          }
        );

        if (response.startsWith('CLARIFY:')) {
          const options = response.substring(8).split('|').map(opt => opt.trim());
          setClarificationOptions(options);
          setCurrentStreamingMessage('I need to clarify your question. Please select one of the options:');
        } else if (response.startsWith('Error:')) {
          setError(response);
        } else {
          addMessage({ type: 'answer', text: response });
        }
      } catch (err) {
        setError('Failed to generate response. Please try again.');
      }
    }
    setIsGenerating(false);
  };

  const handleClarificationSelect = async (option: string) => {
    setClarificationOptions(null);
    setIsGenerating(true);
    setCurrentStreamingMessage('');

    if (aiRef.current) {
      const context = messages.map(m => ({
        role: m.type === 'question' ? 'user' : 'assistant' as const,
        content: m.text,
      }));

      try {
        const response = await aiRef.current.generateResponse(
          option,
          context,
          (token) => {
            setCurrentStreamingMessage(prev => prev + token);
          }
        );

        if (response.startsWith('Error:')) {
          setError(response);
        } else {
          addMessage({ type: 'answer', text: response });
        }
      } catch (err) {
        setError('Failed to generate response. Please try again.');
      }
    }
    setIsGenerating(false);
  };

  const toggleListening = () => {
    if (isListening) {
      transcriptionRef.current?.stop();
    } else {
      transcriptionRef.current?.start();
    }
    setIsListening(!isListening);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  if (!isFloatingMode) return null;

  return (
    <div 
      className={`fixed ${isMinimized ? 'bottom-4 right-4 w-64 h-12' : 'bottom-4 right-4 w-96 h-[600px]'} 
        bg-white rounded-lg shadow-xl border border-gray-200 transition-all duration-300 ease-in-out`}
    >
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Interview Assistant</h2>
          <div className="flex space-x-2">
            <button className="p-2 text-gray-500 hover:text-gray-700">
              <Settings className="h-5 w-5" />
            </button>
            {!isMinimized && (
              <button
                onClick={toggleListening}
                className={`p-2 rounded-full ${
                  isListening ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
                }`}
              >
                <Mic className="h-5 w-5" />
              </button>
            )}
            <button
              onClick={toggleMinimize}
              className="p-2 text-gray-500 hover:text-gray-700"
            >
              {isMinimized ? <Maximize2 className="h-5 w-5" /> : <Minimize2 className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {!isMinimized && (
        <>
          {error && (
            <div className="p-4 bg-red-50">
              <div className="flex items-center space-x-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}

          <div className="h-[calc(100%-8rem)] overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`${
                  message.type === 'question'
                    ? 'bg-gray-100 ml-auto'
                    : 'bg-indigo-50'
                } p-3 rounded-lg max-w-[80%] relative group`}
              >
                <p className="text-sm text-gray-800">{message.text}</p>
                {message.type === 'answer' && (
                  <button
                    onClick={() => copyToClipboard(message.text)}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Copy className="h-4 w-4 text-gray-500 hover:text-gray-700" />
                  </button>
                )}
              </div>
            ))}
            {isGenerating && currentStreamingMessage && (
              <div className="bg-indigo-50 p-3 rounded-lg max-w-[80%]">
                <p className="text-sm text-gray-800">{currentStreamingMessage}</p>
              </div>
            )}
            {clarificationOptions && (
              <div className="bg-white p-3 rounded-lg border border-indigo-100">
                <p className="text-sm text-gray-600 mb-2">Please select one option:</p>
                <div className="space-y-2">
                  {clarificationOptions.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => handleClarificationSelect(option)}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-indigo-50 rounded-md transition-colors duration-150"
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {isGenerating && !currentStreamingMessage && !clarificationOptions && (
              <div className="flex justify-center">
                <Loader2 className="h-6 w-6 text-indigo-600 animate-spin" />
              </div>
            )}
          </div>

          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>{isListening ? 'Listening...' : 'Click mic to start'}</span>
              <span className="text-indigo-600">AI Ready</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}