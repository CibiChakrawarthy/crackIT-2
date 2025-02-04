export class TranscriptionService {
  private recognition: SpeechRecognition | null = null;
  private onTranscription: (text: string) => void;
  private retryCount: number = 0;
  private maxRetries: number = 3;
  private retryTimeout: number = 1000;
  private isListening: boolean = false;
  private reconnectTimer: number | null = null;
  private interimTranscript: string = '';
  private confidenceThreshold: number = 0.7;

  constructor(onTranscription: (text: string) => void) {
    this.onTranscription = onTranscription;

    if ('webkitSpeechRecognition' in window) {
      this.initializeRecognition();
    } else {
      console.error('Speech recognition is not supported in this browser');
    }
  }

  private initializeRecognition() {
    try {
      this.recognition = new webkitSpeechRecognition();
      this.setupRecognition();
    } catch (error) {
      console.error('Failed to initialize speech recognition:', error);
    }
  }

  private setupRecognition() {
    if (!this.recognition) return;

    // Improve continuous recognition
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    
    // Set to US English for better accuracy
    this.recognition.lang = 'en-US';
    
    // Increase max alternatives for better word matching
    this.recognition.maxAlternatives = 3;

    this.recognition.onstart = () => {
      this.isListening = true;
      this.retryCount = 0;
      this.interimTranscript = '';
    };

    this.recognition.onend = () => {
      if (this.isListening) {
        this.handleUnexpectedEnd();
      }
    };

    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      
      switch (event.error) {
        case 'network':
          this.handleNetworkError();
          break;
        case 'audio-capture':
          console.error('No microphone was found or microphone is disabled');
          this.stop();
          break;
        case 'not-allowed':
        case 'service-not-allowed':
          console.error('Microphone permission denied');
          this.stop();
          break;
        default:
          if (this.isListening) {
            this.handleUnexpectedEnd();
          }
      }
    };

    this.recognition.onresult = (event) => {
      let finalTranscript = '';
      this.interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        const confidence = result[0].confidence;

        if (result.isFinal && confidence >= this.confidenceThreshold) {
          finalTranscript += this.processTranscript(transcript);
        } else {
          this.interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        // Process and send only high-confidence, complete phrases
        const processedText = this.processTranscript(finalTranscript);
        if (processedText) {
          this.onTranscription(processedText);
        }
      }
    };
  }

  private processTranscript(transcript: string): string {
    // Remove extra whitespace
    let processed = transcript.trim().replace(/\s+/g, ' ');
    
    // Capitalize first letter of sentences
    processed = processed.replace(/(^\w|\.\s+\w)/g, letter => letter.toUpperCase());
    
    // Fix common transcription errors
    const corrections: { [key: string]: string } = {
      'gonna': 'going to',
      'wanna': 'want to',
      'kinda': 'kind of',
      'lemme': 'let me',
      'gimme': 'give me',
      'dunno': 'don\'t know',
      'gotta': 'got to',
      'tryna': 'trying to'
    };

    for (const [incorrect, correct] of Object.entries(corrections)) {
      const regex = new RegExp(`\\b${incorrect}\\b`, 'gi');
      processed = processed.replace(regex, correct);
    }

    // Add punctuation if missing at the end
    if (!/[.!?]$/.test(processed)) {
      processed += '.';
    }

    return processed;
  }

  private handleNetworkError() {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      const delay = this.retryTimeout * Math.pow(2, this.retryCount - 1);
      
      this.reconnectTimer = window.setTimeout(() => {
        if (this.isListening) {
          this.restart();
        }
      }, delay);
    } else {
      console.error('Max retry attempts reached for speech recognition');
      this.stop();
    }
  }

  private handleUnexpectedEnd() {
    if (this.isListening && this.retryCount < this.maxRetries) {
      this.retryCount++;
      const delay = this.retryTimeout;
      
      this.reconnectTimer = window.setTimeout(() => {
        if (this.isListening) {
          this.restart();
        }
      }, delay);
    }
  }

  private restart() {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        // Ignore errors when stopping
      }
      this.initializeRecognition();
      if (this.isListening) {
        try {
          this.recognition?.start();
        } catch (e) {
          console.error('Failed to restart recognition:', e);
          this.stop();
        }
      }
    }
  }

  start() {
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    this.isListening = true;
    this.retryCount = 0;
    this.interimTranscript = '';
    
    try {
      this.recognition?.start();
    } catch (e) {
      console.error('Failed to start recognition:', e);
      this.stop();
    }
  }

  stop() {
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    this.isListening = false;
    this.retryCount = 0;
    this.interimTranscript = '';
    
    try {
      this.recognition?.stop();
    } catch (e) {
      // Ignore errors when stopping
    }
  }
}