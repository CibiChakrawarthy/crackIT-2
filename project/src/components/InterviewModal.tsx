import React, { useState, useRef, useEffect } from 'react';
import { X, ChevronDown, Mic, Copy, Settings, Loader2, AlertCircle, Video, Link } from 'lucide-react';
import { useInterviewStore } from '../lib/store';
import { TranscriptionService } from '../lib/transcription';
import { AIService } from '../lib/ai';
import { JitsiService } from '../lib/jitsi';
import { JitsiMeeting } from '@jitsi/react-sdk';

export function InterviewModal() {
  const { isModalOpen, setModalOpen, setInterviewContext, isListening, messages, setIsListening, addMessage, interviewContext } = useInterviewStore();
  const [resumeText, setResumeText] = useState('');
  const [role, setRole] = useState('');
  const [domain, setDomain] = useState('General');
  const [interviewType, setInterviewType] = useState('General');
  const [scheduledTime, setScheduledTime] = useState<'immediately' | string>('immediately');
  const [isSetup, setIsSetup] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState('');
  const [clarificationOptions, setClarificationOptions] = useState<string[] | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isInMeeting, setIsInMeeting] = useState(false);
  const [meetingLink, setMeetingLink] = useState('');
  const [joinMethod, setJoinMethod] = useState<'create' | 'join'>('create');
  const [jitsiProps, setJitsiProps] = useState<any>(null);

  const transcriptionRef = useRef<TranscriptionService | null>(null);
  const aiRef = useRef<AIService | null>(null);
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const jitsiService = useRef<JitsiService | null>(null);

  useEffect(() => {
    if (!isSetup && !jitsiService.current) {
      jitsiService.current = new JitsiService(jitsiContainerRef);
    }
  }, [isSetup]);

  useEffect(() => {
    if (!isSetup) {
      aiRef.current = new AIService();
      if (aiRef.current && interviewContext) {
        aiRef.current.setInterviewContext(interviewContext);
      }
      transcriptionRef.current = new TranscriptionService(async (text) => {
        setError(null);
        handleQuestion(text);
      });
      return () => {
        transcriptionRef.current?.stop();
      };
    }
  }, [isSetup, addMessage, messages, interviewContext]);

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

  const handleSubmit = () => {
    setInterviewContext({
      resumeText,
      role,
      domain,
      interviewType,
      scheduledTime,
    });
    setIsSetup(false);
  };

  const joinMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jitsiService.current) {
      setError('Jitsi service not initialized');
      return;
    }

    let finalRoomName = roomName;

    if (joinMethod === 'join' && meetingLink) {
      const parsedRoom = jitsiService.current.parseJitsiLink(meetingLink);
      if (parsedRoom) {
        finalRoomName = parsedRoom;
      } else {
        setError('Invalid Jitsi meeting link');
        return;
      }
    } else if (!roomName) {
      finalRoomName = jitsiService.current.generateRandomRoomName();
    }

    if (!displayName) {
      setError('Please enter your name');
      return;
    }

    setRoomName(finalRoomName);
    const props = jitsiService.current.getMeetingProps(finalRoomName, displayName);
    setJitsiProps(props);
    setIsInMeeting(true);
  };

  const copyMeetingLink = () => {
    if (roomName) {
      const link = `https://meet.jit.si/${roomName}`;
      navigator.clipboard.writeText(link);
    }
  };

  if (!isModalOpen) return null;

  if (isSetup) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg w-[800px] max-h-[90vh] overflow-hidden flex flex-col">
          <div className="flex justify-between items-center p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold">Interview Setup</h2>
            <button onClick={() => setModalOpen(false)} className="text-gray-500 hover:text-gray-700">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto">
            <div className="space-y-6">
              <div>
                <label className="flex justify-between items-center text-sm font-medium text-gray-700 mb-1">
                  Paste Your Resume Text
                  <span className="text-gray-500">Recommended</span>
                </label>
                <textarea
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  placeholder="Copy and paste your resume text here for more personalized responses..."
                  className="w-full h-48 px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                />
              </div>

              <div>
                <label className="flex justify-between items-center text-sm font-medium text-gray-700 mb-1">
                  Role
                  <span className="text-gray-500">Optional</span>
                </label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="Enter the role you're interviewing for"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="flex justify-between items-center text-sm font-medium text-gray-700 mb-1">
                  Select Knowledge Domain
                  <span className="text-gray-500">Optional</span>
                </label>
                <div className="relative">
                  <select
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm appearance-none bg-white focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="General">General</option>
                    <option value="Frontend">Frontend Development</option>
                    <option value="Backend">Backend Development</option>
                    <option value="Fullstack">Full Stack Development</option>
                    <option value="DevOps">DevOps</option>
                    <option value="Mobile">Mobile Development</option>
                    <option value="Data">Data Science</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="flex justify-between items-center text-sm font-medium text-gray-700 mb-1">
                  Interview Type
                  <span className="text-gray-500">Optional</span>
                </label>
                <div className="relative">
                  <select
                    value={interviewType}
                    onChange={(e) => setInterviewType(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm appearance-none bg-white focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="General">General</option>
                    <option value="Technical">Technical</option>
                    <option value="Behavioral">Behavioral</option>
                    <option value="System Design">System Design</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div className="mt-8 flex justify-end space-x-4">
                <button
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Start Interview
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-[95vw] h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-semibold">Live Interview</h2>
          </div>
          <button onClick={() => setModalOpen(false)} className="text-gray-500 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="w-2/3 bg-gray-900 relative">
            <div ref={jitsiContainerRef} className="w-full h-full relative">
              {!isInMeeting ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-white p-8 rounded-lg shadow-lg w-[400px]">
                    <h3 className="text-xl font-semibold mb-6">Join Meeting</h3>
                    {error && (
                      <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">
                        {error}
                      </div>
                    )}
                    <div className="mb-6">
                      <div className="flex space-x-4 mb-4">
                        <button
                          onClick={() => setJoinMethod('create')}
                          className={`flex-1 py-2 px-4 rounded-md ${
                            joinMethod === 'create'
                              ? 'bg-indigo-600 text-white'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          Create Room
                        </button>
                        <button
                          onClick={() => setJoinMethod('join')}
                          className={`flex-1 py-2 px-4 rounded-md ${
                            joinMethod === 'join'
                              ? 'bg-indigo-600 text-white'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          Join Room
                        </button>
                      </div>
                    </div>
                    <form onSubmit={joinMeeting} className="space-y-4">
                      {joinMethod === 'create' ? (
                        <div>
                          <label htmlFor="roomName" className="block text-sm font-medium text-gray-700">
                            Room Name (optional)
                          </label>
                          <input
                            type="text"
                            id="roomName"
                            value={roomName}
                            onChange={(e) => setRoomName(e.target.value)}
                            placeholder="Enter room name or leave empty for random"
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        </div>
                      ) : (
                        <div>
                          <label htmlFor="meetingLink" className="block text-sm font-medium text-gray-700">
                            Meeting Link
                          </label>
                          <input
                            type="text"
                            id="meetingLink"
                            value={meetingLink}
                            onChange={(e) => setMeetingLink(e.target.value)}
                            placeholder="Enter Jitsi meeting link"
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                            required
                          />
                        </div>
                      )}
                      <div>
                        <label htmlFor="displayName" className="block text-sm font-medium text-gray-700">
                          Your Name
                        </label>
                        <input
                          type="text"
                          id="displayName"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="Enter your name"
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                          required
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        <Video className="h-5 w-5 mr-2" />
                        {joinMethod === 'create' ? 'Create & Join Meeting' : 'Join Meeting'}
                      </button>
                      {joinMethod === 'create' && roomName && (
                        <button
                          type="button"
                          onClick={copyMeetingLink}
                          className="w-full flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 mt-2"
                        >
                          <Link className="h-5 w-5 mr-2" />
                          Copy Meeting Link
                        </button>
                      )}
                    </form>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full">
                  {jitsiProps && <JitsiMeeting {...jitsiProps} />}
                </div>
              )}
            </div>
          </div>

          <div className="w-1/3 flex flex-col border-l border-gray-200">
            <div className="p-4 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-900">AI Assistant</h3>
                <div className="flex space-x-2">
                  <button className="p-2 text-gray-500 hover:text-gray-700">
                    <Settings className="h-5 w-5" />
                  </button>
                  <button
                    onClick={toggleListening}
                    className={`p-2 rounded-full ${
                      isListening ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    <Mic className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50">
                <div className="flex items-center space-x-2 text-red-600">
                  <AlertCircle className="h-5 w-5" />
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
          </div>
        </div>
      </div>
    </div>
  );
}