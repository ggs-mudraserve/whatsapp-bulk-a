# replit.md

## Overview

This is a full-stack WhatsApp Marketing SaaS application built with React, Express.js, and PostgreSQL. The application enables users to manage WhatsApp marketing campaigns with features like bulk messaging, inbox management, GPT-powered auto-replies, and anti-blocking protection.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **UI Library**: Radix UI components with Tailwind CSS styling
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for client-side routing
- **Build Tool**: Vite for development and build processes
- **Styling**: Tailwind CSS with CSS variables for theming

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Replit Auth with OpenID Connect
- **Session Management**: Express sessions with PostgreSQL storage
- **API Design**: RESTful API with JSON responses

### Key Technologies
- **Database ORM**: Drizzle with PostgreSQL dialect
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **Authentication**: Replit Auth with passport.js
- **Form Handling**: React Hook Form with Zod validation
- **UI Components**: Radix UI primitives with custom styling

## Key Components

### Authentication System
- **Provider**: Replit Auth with OpenID Connect
- **Session Storage**: PostgreSQL-backed sessions via connect-pg-simple
- **User Management**: Automatic user creation and profile management
- **Authorization**: Role-based access control (Admin, Client roles planned)

### Database Schema
- **Users**: Profile information, preferences, and authentication data
- **WhatsApp Numbers**: Connected phone numbers with status tracking
- **Contacts**: Customer database with tagging and status management
- **Templates**: Reusable message templates with CTA buttons
- **Campaigns**: Bulk messaging campaigns with scheduling and tracking
- **Conversations**: Chat history and message threading
- **Messages**: Individual message records with delivery status
- **Anti-blocking Settings**: User-configurable protection parameters

### Core Features
1. **WhatsApp Integration**: Real QR code-based number connection using Baileys library
2. **Unlimited Numbers**: Support for connecting unlimited WhatsApp numbers via QR codes or manual entry
3. **Manual Number Setup**: Add WhatsApp numbers manually with custom limits and settings
4. **Direct Messaging**: Send messages directly to any WhatsApp number from the inbox
5. **Inbox System**: Real-time message management with chat interface and direct message panel
6. **Campaign Management**: Bulk messaging with personalization and scheduling
7. **Template System**: Reusable message templates with dynamic content
8. **Contact Management**: Customer database with CSV import/export
9. **Anti-blocking Protection**: Message delays, rotation, and behavior simulation
10. **Analytics Dashboard**: Campaign performance and delivery tracking

## Data Flow

### Authentication Flow
1. User initiates login via `/api/login`
2. Replit Auth redirects to OpenID Connect provider
3. User profile created/updated in PostgreSQL
4. Session stored in database with secure cookies
5. Frontend receives user data via `/api/auth/user`

### Campaign Flow
1. User creates/selects message template
2. Contacts selected from database or CSV upload
3. Campaign configured with timing and anti-blocking settings
4. Messages queued with personalization and scheduling
5. WhatsApp integration sends messages with delivery tracking
6. Analytics updated with campaign performance metrics

### Inbox Flow
1. Incoming WhatsApp messages received via webhook
2. Messages stored in conversations/messages tables
3. Real-time updates pushed to frontend
4. Users can reply directly from inbox interface
5. GPT auto-reply processes messages when enabled

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connection
- **drizzle-orm**: Database ORM and query builder
- **@tanstack/react-query**: Server state management
- **@radix-ui/react-***: UI component primitives
- **tailwindcss**: Utility-first CSS framework
- **express**: Web application framework
- **passport**: Authentication middleware

### Planned Integrations
- **Baileys/Venom.js**: WhatsApp Web API integration
- **OpenAI GPT**: Automated response generation
- **Razorpay/Stripe**: Payment processing for credits
- **WebSocket**: Real-time messaging capabilities

## Deployment Strategy

### Development Environment
- **Runtime**: Node.js with tsx for TypeScript execution
- **Database**: Neon Database with connection pooling
- **Hot Reload**: Vite dev server with Express middleware
- **Error Handling**: Runtime error overlay for development

### Production Build
- **Frontend**: Vite build with static asset optimization
- **Backend**: ESBuild compilation to single bundle
- **Database**: Drizzle migrations for schema management
- **Environment**: Production-optimized configuration

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Session encryption key
- `REPL_ID`: Replit environment identifier
- `ISSUER_URL`: OpenID Connect issuer URL

## User Preferences

Preferred communication style: Simple, everyday language.

## Changelog

Changelog:
- July 06, 2025. Initial setup