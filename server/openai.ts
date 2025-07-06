import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY environment variable is required");
}

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface ChatbotResponse {
  message: string;
  shouldReply: boolean;
  confidence: number;
}

export class ChatbotService {
  private defaultPersonality = `You are a helpful WhatsApp marketing assistant. You help customers with:
- Product inquiries
- Order status
- General support questions
- Business information

Keep responses concise, friendly, and professional. Always try to be helpful while maintaining a natural conversational tone.`;

  async generateResponse(
    userMessage: string,
    context?: {
      customerName?: string;
      previousMessages?: string[];
      businessName?: string;
      customInstructions?: string;
    }
  ): Promise<ChatbotResponse> {
    try {
      const systemPrompt = context?.customInstructions || this.defaultPersonality;
      const businessContext = context?.businessName ? `Business: ${context.businessName}` : '';
      const customerContext = context?.customerName ? `Customer: ${context.customerName}` : '';
      
      const conversationHistory = context?.previousMessages?.slice(-5).join('\n') || '';
      
      const prompt = `${systemPrompt}

${businessContext}
${customerContext}

Recent conversation:
${conversationHistory}

Customer message: "${userMessage}"

Respond naturally and helpfully. If the message seems like spam, promotional content from competitors, or inappropriate, respond with just "IGNORE" and I'll know not to reply.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: prompt }
        ],
        max_tokens: 200,
        temperature: 0.7,
      });

      const botResponse = response.choices[0].message.content?.trim() || '';
      
      // Check if bot suggests ignoring the message
      if (botResponse === "IGNORE") {
        return {
          message: '',
          shouldReply: false,
          confidence: 0.9
        };
      }

      return {
        message: botResponse,
        shouldReply: true,
        confidence: 0.8
      };
    } catch (error) {
      console.error("Error generating chatbot response:", error);
      return {
        message: "Thanks for your message! We'll get back to you soon.",
        shouldReply: true,
        confidence: 0.3
      };
    }
  }

  async analyzeSentiment(message: string): Promise<{
    sentiment: 'positive' | 'negative' | 'neutral';
    confidence: number;
  }> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "Analyze the sentiment of the message. Respond with JSON in this format: { \"sentiment\": \"positive|negative|neutral\", \"confidence\": 0.85 }"
          },
          {
            role: "user",
            content: message
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 50,
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return {
        sentiment: result.sentiment || 'neutral',
        confidence: Math.max(0, Math.min(1, result.confidence || 0.5))
      };
    } catch (error) {
      console.error("Error analyzing sentiment:", error);
      return { sentiment: 'neutral', confidence: 0.5 };
    }
  }

  async generateTemplateVariations(baseTemplate: string, count: number = 3): Promise<string[]> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `Create ${count} variations of the given marketing message template. Keep the same core message but vary the wording, tone, and structure. Return as JSON array of strings.`
          },
          {
            role: "user",
            content: baseTemplate
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 500,
      });

      const result = JSON.parse(response.choices[0].message.content || '{"variations": []}');
      return result.variations || [baseTemplate];
    } catch (error) {
      console.error("Error generating template variations:", error);
      return [baseTemplate];
    }
  }
}

export const chatbotService = new ChatbotService();