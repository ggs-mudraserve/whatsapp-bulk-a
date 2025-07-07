import OpenAI from "openai";

export interface ChatbotResponse {
  message: string;
  shouldReply: boolean;
  confidence: number;
  tokensUsed?: number;
  provider?: string;
  model?: string;
}

export interface SentimentAnalysis {
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  emotions?: string[];
}

export interface AIProviderConfig {
  provider: string;
  model: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
}

export class MultiProviderAIService {
  // No default personality - AI uses only user's custom prompt

  // Create provider-specific client
  private createClient(config: AIProviderConfig) {
    const apiKey = config.apiKey || process.env.OPENAI_API_KEY;
    
    switch (config.provider) {
      case 'openai':
        return new OpenAI({ apiKey });
      case 'anthropic':
        // Use OpenAI-compatible interface for now
        return new OpenAI({ 
          apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY,
          baseURL: 'https://api.anthropic.com/v1'
        });
      case 'gemini':
        // Use OpenAI-compatible interface for now
        return new OpenAI({ 
          apiKey: config.apiKey || process.env.GEMINI_API_KEY,
          baseURL: 'https://generativelanguage.googleapis.com/v1beta'
        });
      case 'cohere':
        return new OpenAI({ 
          apiKey: config.apiKey || process.env.COHERE_API_KEY,
          baseURL: 'https://api.cohere.ai/v1'
        });
      case 'mistral':
        return new OpenAI({ 
          apiKey: config.apiKey || process.env.MISTRAL_API_KEY,
          baseURL: 'https://api.mistral.ai/v1'
        });
      default:
        throw new Error(`Unsupported AI provider: ${config.provider}`);
    }
  }

  // Generate response using specified provider and model
  async generateResponse(
    userMessage: string,
    config: AIProviderConfig,
    context?: {
      customerName?: string;
      previousMessages?: string[];
      businessName?: string;
      customInstructions?: string;
      webAppData?: {
        contacts?: any[];
        conversations?: any[];
        whatsappNumbers?: any[];
      };
    }
  ): Promise<ChatbotResponse> {
    try {
      const client = this.createClient(config);
      
      // Use ONLY the user's custom prompt - no default personality
      let systemPrompt = '';
      
      if (context?.customInstructions) {
        // Use exclusively the user's custom instructions - NO modifications
        systemPrompt = context.customInstructions;
        
        // Add customer context
        if (context.customerName) {
          systemPrompt += `\n\nYou are currently talking to: ${context.customerName}`;
        }
      } else {
        // Fallback only if no custom instructions provided
        systemPrompt = "You are a helpful assistant.";
      }

      // Add conversation context
      const messages: any[] = [
        { role: "system", content: systemPrompt }
      ];

      if (context?.previousMessages && context.previousMessages.length > 0) {
        // Add recent conversation history
        const recentMessages = context.previousMessages.slice(-6); // Last 6 messages
        recentMessages.forEach((msg) => {
          const [speaker, content] = msg.split(': ', 2);
          messages.push({
            role: speaker === 'Customer' ? 'user' : 'assistant',
            content: content
          });
        });
      }

      // Add current user message
      messages.push({ role: "user", content: userMessage });

      // Debug: Log the complete messages array being sent to AI
      console.log('🔍 Debug: Messages being sent to AI:', JSON.stringify(messages, null, 2));
      console.log('🔍 Debug: System prompt being used:', messages[0]?.content);

      // Make API call based on provider
      const response = await this.makeProviderCall(client, config, messages);
      
      return {
        message: response.content,
        shouldReply: this.shouldAutoReply(userMessage, response.content),
        confidence: this.calculateConfidence(response.content),
        tokensUsed: response.tokensUsed,
        provider: config.provider,
        model: config.model
      };
    } catch (error) {
      console.error(`AI Provider Error (${config.provider}):`, error);
      throw new Error(`Failed to generate response using ${config.provider}: ${error.message}`);
    }
  }

  // Provider-specific API calls
  private async makeProviderCall(client: OpenAI, config: AIProviderConfig, messages: any[]) {
    const temperature = config.temperature || 0.7;
    const maxTokens = config.maxTokens || 150;

    switch (config.provider) {
      case 'openai':
        console.log('🔍 Debug: Making OpenAI API call with model:', config.model);
        const openaiResponse = await client.chat.completions.create({
          model: config.model,
          messages,
          temperature,
          max_tokens: maxTokens,
        });
        const responseContent = openaiResponse.choices[0]?.message?.content || '';
        console.log('🔍 Debug: OpenAI response received:', responseContent);
        return {
          content: responseContent,
          tokensUsed: openaiResponse.usage?.total_tokens
        };

      case 'anthropic':
        // Direct Anthropic API call
        const anthropicResponse = await this.callAnthropicAPI(config, messages);
        return anthropicResponse;

      case 'gemini':
        // Direct Gemini API call
        const geminiResponse = await this.callGeminiAPI(config, messages);
        return geminiResponse;

      case 'cohere':
        // Direct Cohere API call
        const cohereResponse = await this.callCohereAPI(config, messages);
        return cohereResponse;

      case 'mistral':
        // Direct Mistral API call
        const mistralResponse = await this.callMistralAPI(config, messages);
        return mistralResponse;

      default:
        throw new Error(`Provider ${config.provider} not implemented`);
    }
  }

  // Anthropic Claude API
  private async callAnthropicAPI(config: AIProviderConfig, messages: any[]) {
    const apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY;
    
    // Convert messages to Anthropic format
    const systemMessage = messages.find(m => m.role === 'system')?.content || '';
    const userMessages = messages.filter(m => m.role !== 'system');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: config.maxTokens || 150,
        temperature: config.temperature || 0.7,
        system: systemMessage,
        messages: userMessages
      })
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      content: data.content[0]?.text || '',
      tokensUsed: data.usage?.total_tokens
    };
  }

  // Google Gemini API
  private async callGeminiAPI(config: AIProviderConfig, messages: any[]) {
    const apiKey = config.apiKey || process.env.GEMINI_API_KEY;
    
    // Convert messages to Gemini format
    const prompt = messages.map(m => `${m.role}: ${m.content}`).join('\n');

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: config.temperature || 0.7,
          maxOutputTokens: config.maxTokens || 150,
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      content: data.candidates[0]?.content?.parts[0]?.text || '',
      tokensUsed: data.usageMetadata?.totalTokenCount
    };
  }

  // Cohere API
  private async callCohereAPI(config: AIProviderConfig, messages: any[]) {
    const apiKey = config.apiKey || process.env.COHERE_API_KEY;
    
    // Convert messages to Cohere format
    const prompt = messages.map(m => `${m.role}: ${m.content}`).join('\n') + '\nassistant:';

    const response = await fetch('https://api.cohere.ai/v1/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        prompt,
        max_tokens: config.maxTokens || 150,
        temperature: config.temperature || 0.7,
        stop_sequences: ['user:', 'system:']
      })
    });

    if (!response.ok) {
      throw new Error(`Cohere API error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      content: data.generations[0]?.text?.trim() || '',
      tokensUsed: data.meta?.tokens?.total_tokens
    };
  }

  // Mistral AI API
  private async callMistralAPI(config: AIProviderConfig, messages: any[]) {
    const apiKey = config.apiKey || process.env.MISTRAL_API_KEY;

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: config.temperature || 0.7,
        max_tokens: config.maxTokens || 150,
      })
    });

    if (!response.ok) {
      throw new Error(`Mistral API error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      content: data.choices[0]?.message?.content || '',
      tokensUsed: data.usage?.total_tokens
    };
  }

  // Advanced sentiment analysis
  async analyzeSentiment(message: string, config: AIProviderConfig): Promise<SentimentAnalysis> {
    try {
      const client = this.createClient(config);
      
      const prompt = `Analyze the sentiment and emotions in this message. Respond with JSON only:
{
  "sentiment": "positive|negative|neutral",
  "confidence": 0.0-1.0,
  "emotions": ["emotion1", "emotion2"]
}

Message: "${message}"`;

      const response = await client.chat.completions.create({
        model: config.model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 100,
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0]?.message?.content || '{}');
      return {
        sentiment: result.sentiment || 'neutral',
        confidence: result.confidence || 0.5,
        emotions: result.emotions || []
      };
    } catch (error) {
      console.error("Sentiment analysis error:", error);
      return {
        sentiment: 'neutral',
        confidence: 0.5,
        emotions: []
      };
    }
  }

  // Generate multiple template variations
  async generateTemplateVariations(baseTemplate: string, config: AIProviderConfig, count: number = 3): Promise<string[]> {
    try {
      const client = this.createClient(config);
      
      const prompt = `Create ${count} professional variations of this WhatsApp message template. Keep the same meaning but vary the wording, tone, and structure. Each variation should be suitable for business communication.

Original template: "${baseTemplate}"

Respond with JSON array of variations only:
["variation1", "variation2", "variation3"]`;

      const response = await client.chat.completions.create({
        model: config.model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.8,
        max_tokens: 300,
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0]?.message?.content || '[]');
      return Array.isArray(result) ? result : [baseTemplate];
    } catch (error) {
      console.error("Template generation error:", error);
      return [baseTemplate];
    }
  }

  // Smart message categorization
  async categorizeMessage(message: string, config: AIProviderConfig): Promise<{
    category: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    requiresHuman: boolean;
    suggestedActions: string[];
  }> {
    try {
      const client = this.createClient(config);
      
      const prompt = `Categorize this customer message and provide actionable insights. Respond with JSON only:
{
  "category": "support|sales|complaint|inquiry|spam|other",
  "priority": "low|medium|high|urgent",
  "requiresHuman": true/false,
  "suggestedActions": ["action1", "action2"]
}

Message: "${message}"`;

      const response = await client.chat.completions.create({
        model: config.model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 150,
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0]?.message?.content || '{}');
      return {
        category: result.category || 'other',
        priority: result.priority || 'medium',
        requiresHuman: result.requiresHuman || false,
        suggestedActions: result.suggestedActions || []
      };
    } catch (error) {
      console.error("Message categorization error:", error);
      return {
        category: 'other',
        priority: 'medium',
        requiresHuman: false,
        suggestedActions: []
      };
    }
  }

  // Utility methods
  private shouldAutoReply(userMessage: string, response: string): boolean {
    console.log(`🤖 shouldAutoReply check: message="${userMessage}", messageLength=${userMessage.length}, response length=${response.length}`);
    
    // Always reply when AI is enabled - this is what users expect from an AI chatbot
    if (userMessage.length > 0 && response.length > 0) {
      console.log('✅ AI will reply to message');
      return true;
    }
    
    console.log('❌ AI will not reply - insufficient content');
    return false;
  }

  private calculateConfidence(response: string): number {
    // Simple confidence calculation based on response quality
    if (response.length < 10) return 0.3;
    if (response.length < 50) return 0.6;
    if (response.includes('sorry') || response.includes('cannot')) return 0.4;
    return 0.8;
  }

  // Get available models for each provider
  static getAvailableModels(provider: string): string[] {
    const models = {
      openai: [
        'gpt-4o',
        'gpt-4o-mini', 
        'gpt-4-turbo',
        'gpt-4',
        'gpt-3.5-turbo',
        'gpt-3.5-turbo-16k'
      ],
      anthropic: [
        'claude-3-5-sonnet-20241022',
        'claude-3-haiku-20240307',
        'claude-3-opus-20240229',
        'claude-3-sonnet-20240229'
      ],
      gemini: [
        'gemini-pro',
        'gemini-pro-vision',
        'gemini-1.5-pro',
        'gemini-1.0-pro'
      ],
      cohere: [
        'command-r-plus',
        'command-r',
        'command',
        'command-nightly'
      ],
      mistral: [
        'mistral-large-latest',
        'mistral-medium-latest',
        'mistral-small-latest',
        'open-mixtral-8x7b',
        'open-mistral-7b'
      ]
    };
    
    return models[provider] || [];
  }
}

export const multiAIService = new MultiProviderAIService();