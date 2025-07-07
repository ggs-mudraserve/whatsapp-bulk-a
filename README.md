# WhatsApp Marketing SaaS Application

A comprehensive WhatsApp Marketing dashboard with advanced AI-powered agent management, enabling enterprise-level communication through intelligent, customizable chatbot solutions.

## 🚀 Features

### Core Features
- **Multi-Number WhatsApp Integration**: Connect unlimited WhatsApp numbers via QR codes
- **AI-Powered Auto-Reply**: Custom AI agents with OpenAI GPT-4o integration
- **Real-Time Inbox Management**: WhatsApp-style chat interface with live message sync
- **Advanced Campaign Management**: Bulk messaging with anti-blocking protection
- **Contact Management**: CSV import/export with tagging and blocking capabilities
- **Template System**: Reusable message templates with dynamic content
- **Analytics Dashboard**: Campaign performance and delivery tracking

### AI Agent System
- **Custom AI Agents**: Create personalized chatbots with custom prompts
- **Multi-Provider Support**: OpenAI, Anthropic Claude, Google Gemini, Cohere, Mistral
- **Context-Aware Responses**: Integrates with your application data
- **Real-Time Sync**: AI agent status updates across all pages
- **Business-Specific Training**: DSA Loan Services integration example

### Anti-Blocking Protection
- **Smart Message Delays**: Human-like typing simulation
- **Number Rotation**: Intelligent load balancing across multiple WhatsApp numbers
- **Business Hours Restrictions**: Automated scheduling
- **Rate Limiting**: Configurable message limits per number

## 🛠️ Technology Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Radix UI** components
- **TanStack Query** for state management
- **Wouter** for routing
- **Vite** for build tooling

### Backend
- **Node.js** with Express.js
- **PostgreSQL** database with Drizzle ORM
- **whatsapp-web.js** for WhatsApp integration
- **Puppeteer** for browser automation
- **OpenAI GPT-4o** for AI responses

### Database
- **PostgreSQL** with Neon Database
- **Drizzle ORM** with migrations
- **Session management** with PostgreSQL storage

## 🔧 Installation

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- OpenAI API key (for AI features)

### Setup
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   ```bash
   DATABASE_URL=your_postgresql_connection_string
   OPENAI_API_KEY=your_openai_api_key
   SESSION_SECRET=your_session_secret
   ```
4. Run database migrations:
   ```bash
   npm run db:push
   ```
5. Start the development server:
   ```bash
   npm run dev
   ```

## 🎯 Usage

### Connecting WhatsApp Numbers
1. Navigate to the WhatsApp page
2. Click "Connect New Number"
3. Scan the QR code with your WhatsApp mobile app
4. Wait for connection confirmation

### Setting Up AI Agents
1. Go to AI Agents page
2. Click "Create New Agent"
3. Configure your agent with:
   - Custom name and role
   - Business-specific instructions
   - AI provider and model settings
4. Test the agent with sample messages

### Managing Campaigns
1. Create message templates
2. Import contacts via CSV
3. Configure anti-blocking settings
4. Launch campaigns with scheduling

### Inbox Management
- View all conversations in real-time
- Send direct messages to any WhatsApp number
- Block/unblock contacts
- Delete conversations
- AI agent responses with on/off toggle

## 🔒 Security Features

- **Authentication**: Replit Auth with OpenID Connect
- **Session Management**: Secure PostgreSQL-backed sessions
- **API Key Protection**: Encrypted storage of user API keys
- **Rate Limiting**: Built-in protection against spam
- **Input Validation**: Comprehensive request validation

## 📊 Database Schema

### Core Tables
- `users`: User profiles and preferences
- `whatsapp_numbers`: Connected phone numbers
- `contacts`: Customer database with status tracking
- `conversations`: Chat threads and metadata
- `messages`: Individual message records
- `campaigns`: Bulk messaging campaigns
- `templates`: Reusable message templates
- `chatbot_settings`: AI agent configurations

## 🤖 AI Integration

### Supported Providers
- **OpenAI**: GPT-4o, GPT-4, GPT-3.5
- **Anthropic**: Claude 3.5 Sonnet, Claude 3 Haiku
- **Google Gemini**: Gemini Pro, Gemini Vision
- **Cohere**: Command R+, Command R
- **Mistral**: Mistral Large, Mistral Medium

### Custom Agent Creation
```javascript
// Example DSA Loan Assistant configuration
{
  name: "DSA Loan Assistant",
  role: "Loan Advisor",
  instructions: "You are an AI Loan Assistant for a Direct Selling Agent (DSA) company...",
  provider: "openai",
  model: "gpt-4o",
  temperature: 0.7,
  maxTokens: 150
}
```

## 🚀 Deployment

### Production Setup
1. Build the application:
   ```bash
   npm run build
   ```
2. Set production environment variables
3. Deploy to your preferred hosting platform
4. Configure SSL certificates
5. Set up monitoring and logging

### Environment Variables
```bash
# Database
DATABASE_URL=postgresql://...

# Authentication
SESSION_SECRET=your_secret_key
ISSUER_URL=your_auth_issuer

# AI Providers (Optional)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=...
```

## 📈 Performance

- **Real-time sync**: 2-second conversation updates
- **Message processing**: 1-second message updates
- **Session management**: 5 concurrent WhatsApp sessions per user
- **Anti-blocking**: Human-like delays and rotation
- **Database optimization**: Indexed queries with connection pooling

## 🔧 Development

### Project Structure
```
├── client/src/          # React frontend
├── server/              # Express backend
├── shared/              # Shared types and schemas
├── auth_info_*/         # WhatsApp session data
└── attached_assets/     # Static assets
```

### Key Files
- `server/ai-service.ts`: Multi-provider AI integration
- `server/whatsapp-persistent.ts`: WhatsApp client management
- `server/routes.ts`: API endpoints
- `shared/schema.ts`: Database schema
- `client/src/App.tsx`: Main React application

## 📞 Support

For technical support or feature requests, please refer to the project documentation or contact the development team.

## 📄 License

This project is licensed under the MIT License. See the LICENSE file for details.

---

**Built with ❤️ for modern WhatsApp marketing automation**