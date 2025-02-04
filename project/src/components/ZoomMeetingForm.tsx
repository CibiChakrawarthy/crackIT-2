import React, { useState } from 'react';
import { ZoomService } from '../lib/zoom';

interface ZoomMeetingFormProps {
  onJoinSuccess: () => void;
  onError: (error: string) => void;
  containerRef: React.RefObject<HTMLDivElement>;
}

export function ZoomMeetingForm({ onJoinSuccess, onError, containerRef }: ZoomMeetingFormProps) {
  const [meetingNumber, setMeetingNumber] = useState('');
  const [password, setPassword] = useState('');
  const [userName, setUserName] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const handleJoinMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsJoining(true);

    try {
      const zoomService = new ZoomService(containerRef);
      await zoomService.joinMeeting(meetingNumber, userName, password);
      onJoinSuccess();
    } catch (error) {
      onError('Failed to join Zoom meeting. Please check your meeting details and try again.');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <form onSubmit={handleJoinMeeting} className="space-y-4">
      <div>
        <label htmlFor="meetingNumber" className="block text-sm font-medium text-gray-700">
          Meeting ID
        </label>
        <input
          type="text"
          id="meetingNumber"
          value={meetingNumber}
          onChange={(e) => setMeetingNumber(e.target.value)}
          placeholder="Enter Zoom Meeting ID"
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          required
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Meeting Password
        </label>
        <input
          type="password"
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter meeting password"
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          required
        />
      </div>

      <div>
        <label htmlFor="userName" className="block text-sm font-medium text-gray-700">
          Your Name
        </label>
        <input
          type="text"
          id="userName"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          placeholder="Enter your name"
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          required
        />
      </div>

      <button
        type="submit"
        disabled={isJoining}
        className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
      >
        {isJoining ? 'Joining...' : 'Join Meeting'}
      </button>
    </form>
  );
}