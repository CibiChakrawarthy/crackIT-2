export class AIService {
  private apiKey: string;
  private baseUrl: string;
  private isConfigured: boolean;
  private maxRetries: number = 3;
  private retryDelay: number = 1000;
  private models = [
    'anthropic/claude-2',
    'openai/gpt-4',
    'openai/gpt-3.5-turbo',
    'google/palm-2-chat-bison'
  ];
  private interviewContext: any = null;

  constructor() {
    this.apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
    this.baseUrl = 'https://openrouter.ai/api/v1/chat/completions';
    this.isConfigured = Boolean(this.apiKey);

    if (!this.isConfigured) {
      console.error('OpenRouter API key is not configured');
    }
  }

  setInterviewContext(context: any) {
    this.interviewContext = context;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async makeStreamingRequest(
    question: string,
    context: { role: 'user' | 'assistant'; content: string }[],
    onToken: (token: string) => void,
    retryCount: number = 0,
    modelIndex: number = 0
  ): Promise<void> {
    if (!question.trim()) {
      throw new Error('Question cannot be empty');
    }

    if (modelIndex >= this.models.length) {
      throw new Error('All models have been tried without success');
    }

    try {
      const recentContext = context.slice(-4);
      const model = this.models[modelIndex];

      let systemPrompt = `You are an expert technical interviewer and coding mentor with deep knowledge of software development, algorithms, system design, and best practices. Your role is to help candidates excel in technical interviews by providing detailed, technically accurate responses.`;
      
      if (this.interviewContext) {
        const { resumeText, role, domain, interviewType } = this.interviewContext;
        systemPrompt += `\n\nContext for this interview:`;
        if (resumeText) {
          systemPrompt += `\n\nCandidate's Resume:\n${resumeText}`;
          systemPrompt += `\n\nUse the above resume information to provide highly personalized responses that align with the candidate's technical experience and skills.`;
        }
        if (role) systemPrompt += `\n- Role: ${role}`;
        if (domain) systemPrompt += `\n- Domain: ${domain}`;
        if (interviewType) systemPrompt += `\n- Interview Type: ${interviewType}`;
        systemPrompt += `\n\nTailor your responses to be specifically relevant for this technical context.`;
      }

      systemPrompt += `\n\nProvide detailed, technically accurate responses that:

1. Technical Depth:
- Demonstrate deep understanding of computer science fundamentals
- Explain complex concepts clearly with examples
- Include code snippets when relevant (using proper syntax and best practices)
- Cover edge cases and performance considerations

2. Response Structure:
- Start with a high-level overview
- Break down complex topics into digestible parts
- Include specific examples and use cases
- Address both theoretical concepts and practical implementation

3. Key Areas to Cover:
- Data Structures & Algorithms
  * Time and space complexity analysis
  * Optimization techniques
  * Trade-offs between different approaches
- System Design
  * Scalability considerations
  * Design patterns
  * Architecture best practices
- Coding Best Practices
  * Clean code principles
  * Testing strategies
  * Performance optimization
  * Security considerations

4. Problem-Solving Approach:
- Break down problems systematically
- Consider multiple solutions
- Explain trade-offs between different approaches
- Discuss real-world applications

5. Technical Communication:
- Use precise technical terminology
- Explain complex concepts clearly
- Provide relevant analogies when helpful
- Balance technical depth with clarity

For coding questions:
- Start with clarifying questions
- Discuss the approach before implementation
- Consider edge cases
- Analyze time and space complexity
- Suggest optimizations
- Discuss testing strategies

For system design questions:
- Gather requirements
- Define system constraints
- Break down into components
- Address scalability
- Consider trade-offs
- Discuss monitoring and maintenance

Keep responses technically accurate, practical, and focused on demonstrating both knowledge and problem-solving ability.

IMPORTANT: Always provide complete, technically sound responses. Include code examples when relevant, using proper formatting and commenting.`;

      const messages = [
        {
          role: 'system',
          content: systemPrompt
        },
        ...recentContext,
        { role: 'user', content: question }
      ];

      const requestBody = {
        model,
        messages,
        temperature: 0.7,
        max_tokens: 800,
        stream: true,
        frequency_penalty: 0.2,
        presence_penalty: 0.4
      };

      console.log('Making API request to:', this.baseUrl);
      console.log('Using model:', model);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45000); // 45 second timeout

      try {
        const response = await fetch(this.baseUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            'HTTP-Referer': window.location.origin,
            'X-Title': 'Technical Interview Assistant'
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });

        clearTimeout(timeout);

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          console.error('API error response:', {
            status: response.status,
            statusText: response.statusText,
            data
          });
          
          const errorMessage = data?.error?.message || `API request failed with status ${response.status} (${response.statusText})`;
          
          if (response.status === 401) {
            throw new Error('Invalid API key. Please check your OpenRouter API key configuration.');
          }
          
          if (response.status === 429 || response.status === 502) {
            console.log(`Model ${model} failed, trying next model...`);
            return this.makeStreamingRequest(question, context, onToken, retryCount, modelIndex + 1);
          }
          
          throw new Error(errorMessage);
        }

        if (!response.body) {
          throw new Error('Response body is null');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let hasReceivedContent = false;
        let contentStartTime = Date.now();
        let lastContentTime = contentStartTime;

        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            if (!hasReceivedContent) {
              console.log(`No content from model ${model}, trying next model...`);
              return this.makeStreamingRequest(question, context, onToken, retryCount, modelIndex + 1);
            }
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim() === '') continue;
            if (line.trim() === 'data: [DONE]') continue;

            try {
              const data = JSON.parse(line.replace(/^data: /, ''));
              const token = data.choices?.[0]?.delta?.content || '';
              if (token) {
                hasReceivedContent = true;
                lastContentTime = Date.now();
                onToken(token);
              }
            } catch (e) {
              console.warn('Failed to parse streaming response line:', e);
            }
          }

          if (hasReceivedContent && Date.now() - lastContentTime > 8000) {
            console.warn('Content stream timeout - no new content received for 8 seconds');
            break;
          }

          if (!hasReceivedContent && Date.now() - contentStartTime > 15000) {
            console.log(`Timeout waiting for content from model ${model}, trying next model...`);
            return this.makeStreamingRequest(question, context, onToken, retryCount, modelIndex + 1);
          }
        }

      } finally {
        clearTimeout(timeout);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error in makeStreamingRequest:', {
        message: errorMessage,
        retryCount,
        model: this.models[modelIndex]
      });

      if (error instanceof Error && error.name === 'AbortError') {
        console.log(`Request timeout for model ${this.models[modelIndex]}, trying next model...`);
        return this.makeStreamingRequest(question, context, onToken, retryCount, modelIndex + 1);
      }

      if (!(error instanceof Error && error.message.includes('API key'))) {
        if (modelIndex < this.models.length - 1) {
          console.log(`Error with model ${this.models[modelIndex]}, trying next model...`);
          return this.makeStreamingRequest(question, context, onToken, retryCount, modelIndex + 1);
        }
      }
      throw error;
    }
  }

  async generateResponse(
    question: string,
    context: { role: 'user' | 'assistant'; content: string }[],
    onToken?: (token: string) => void
  ): Promise<string> {
    if (!this.isConfigured) {
      return 'Error: OpenRouter API key is not configured. Please add your API key to the .env file.';
    }

    try {
      let fullResponse = '';
      
      await this.makeStreamingRequest(
        question,
        context,
        (token) => {
          fullResponse += token;
          onToken?.(token);
        }
      );

      if (!fullResponse.trim()) {
        return 'I apologize, but I was unable to generate a response. Please try asking your question again in a moment.';
      }

      return fullResponse;
    } catch (error) {
      console.error('Error generating AI response:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          return 'Error: There seems to be an issue with the API key configuration. Please check your settings.';
        } else if (error.message.includes('overloaded') || error.message.includes('429')) {
          return 'The service is currently busy. Please wait a moment and try again.';
        } else if (error.message.includes('502')) {
          return 'The service is temporarily unavailable. Please try again in a few moments.';
        }
        return `Error: ${error.message}`;
      }
      
      return 'The AI service is currently unavailable. Please try again in a few moments.';
    }
  }
}