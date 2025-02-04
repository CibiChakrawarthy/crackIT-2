import type { IJitsiMeetingProps } from '@jitsi/react-sdk';

export class JitsiService {
  private containerRef: React.RefObject<HTMLDivElement>;
  private domain: string = 'meet.jit.si';
  private configOverwrite = {
    startWithAudioMuted: false,
    startWithVideoMuted: false,
    disableModeratorIndicator: true,
    startScreenSharing: false,
    enableEmailInStats: false,
    prejoinPageEnabled: false,
    disableDeepLinking: true,
    toolbarButtons: [
      'camera',
      'chat',
      'closedcaptions',
      'desktop',
      'fullscreen',
      'hangup',
      'microphone',
      'participants-pane',
      'settings',
      'toggle-camera'
    ]
  };

  private interfaceConfigOverwrite = {
    DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
    MOBILE_APP_PROMO: false,
    SHOW_CHROME_EXTENSION_BANNER: false,
    HIDE_INVITE_MORE_HEADER: true,
    DEFAULT_BACKGROUND: '#000000'
  };

  constructor(containerRef: React.RefObject<HTMLDivElement>) {
    this.containerRef = containerRef;
  }

  getMeetingProps(roomName: string, displayName: string): IJitsiMeetingProps {
    return {
      domain: this.domain,
      roomName: this.sanitizeRoomName(roomName),
      configOverwrite: {
        ...this.configOverwrite,
        // Add these settings to ensure proper initialization
        disableInitialGUM: false,
        startWithAudioMuted: false,
        startWithVideoMuted: false,
        enableWelcomePage: false,
        enableClosePage: false
      },
      interfaceConfigOverwrite: this.interfaceConfigOverwrite,
      userInfo: {
        displayName
      },
      onApiReady: (externalApi) => {
        console.log('Jitsi Meet External API ready');
        // Add event listeners for better error handling
        externalApi.addListener('videoConferenceJoined', () => {
          console.log('Successfully joined video conference');
        });
        externalApi.addListener('videoConferenceLeft', () => {
          console.log('Left video conference');
        });
        externalApi.addListener('participantJoined', () => {
          console.log('A participant joined');
        });
      },
      getIFrameRef: (iframeRef) => {
        if (iframeRef) {
          iframeRef.style.height = '100%';
          iframeRef.style.width = '100%';
          iframeRef.style.border = '0';
          // Add allow attributes for proper permissions
          iframeRef.allow = "camera; microphone; display-capture; autoplay; clipboard-write";
        }
      }
    };
  }

  private sanitizeRoomName(name: string): string {
    // Remove special characters and spaces, convert to lowercase
    return name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  }

  generateRandomRoomName(): string {
    const adjectives = ['swift', 'bright', 'clever', 'eager', 'kind', 'brave'];
    const nouns = ['falcon', 'tiger', 'eagle', 'wolf', 'bear', 'lion'];
    const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    const randomNum = Math.floor(Math.random() * 1000);
    return `interview-${randomAdjective}-${randomNoun}-${randomNum}`;
  }

  parseJitsiLink(link: string): string | null {
    try {
      const url = new URL(link);
      if (url.hostname === 'meet.jit.si') {
        // Remove leading slash and sanitize
        return this.sanitizeRoomName(url.pathname.substring(1));
      }
      return null;
    } catch {
      return null;
    }
  }
}