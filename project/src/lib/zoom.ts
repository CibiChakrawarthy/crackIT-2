import { ZoomMtg } from '@zoom/meetingsdk';
import KJUR from 'jsrsasign';

export class ZoomService {
  private isInitialized: boolean = false;
  private containerRef: React.RefObject<HTMLDivElement>;
  private sdkKey: string;

  constructor(containerRef: React.RefObject<HTMLDivElement>) {
    this.containerRef = containerRef;
    this.sdkKey = import.meta.env.VITE_ZOOM_SDK_KEY || '';
    
    // Load Zoom SDK
    ZoomMtg.setZoomJSLib('https://source.zoom.us/2.18.0/lib', '/av');
    ZoomMtg.preLoadWasm();
    ZoomMtg.prepareWebSDK();
  }

  private async initialize(): Promise<void> {
    if (!this.isInitialized) {
      return new Promise((resolve, reject) => {
        ZoomMtg.init({
          leaveUrl: window.location.origin,
          disableCORP: true,
          success: () => {
            this.isInitialized = true;
            resolve();
          },
          error: (error: any) => {
            console.error('Failed to initialize Zoom:', error);
            reject(error);
          }
        });
      });
    }
  }

  private generateSignature(meetingNumber: string): string {
    const iat = Math.round(new Date().getTime() / 1000) - 30;
    const exp = iat + 60 * 60 * 2;
    const oHeader = { alg: 'HS256', typ: 'JWT' };
    
    const oPayload = {
      sdkKey: this.sdkKey,
      mn: meetingNumber,
      role: 0,
      iat: iat,
      exp: exp,
      appKey: this.sdkKey,
      tokenExp: iat + 60 * 60 * 2
    };

    const sHeader = JSON.stringify(oHeader);
    const sPayload = JSON.stringify(oPayload);
    const sdkSecret = import.meta.env.VITE_ZOOM_SDK_SECRET;
    
    return KJUR.jws.JWS.sign('HS256', sHeader, sPayload, sdkSecret);
  }

  async joinMeeting(meetingNumber: string, userName: string, password: string): Promise<void> {
    if (!this.sdkKey) {
      throw new Error('Zoom SDK key is not configured');
    }

    try {
      await this.initialize();

      // Generate signature
      const signature = this.generateSignature(meetingNumber);

      // Ensure the Zoom container is mounted
      if (!this.containerRef.current) {
        throw new Error('Zoom container not found');
      }

      // Join meeting
      return new Promise((resolve, reject) => {
        ZoomMtg.join({
          meetingNumber: meetingNumber,
          userName: userName,
          signature: signature,
          sdkKey: this.sdkKey,
          password: password,
          success: () => {
            console.log('Joined meeting successfully');
            resolve();
          },
          error: (error: any) => {
            console.error('Failed to join meeting:', error);
            reject(error);
          }
        });
      });
    } catch (error) {
      console.error('Error joining meeting:', error);
      throw error;
    }
  }

  leaveMeeting(): void {
    ZoomMtg.leaveMeeting({
      success: () => {
        console.log('Left meeting successfully');
        if (this.containerRef.current) {
          this.containerRef.current.innerHTML = '';
        }
      },
      error: (error: any) => {
        console.error('Failed to leave meeting:', error);
      }
    });
  }
}