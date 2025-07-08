import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Import whatsapp-web.js using CommonJS require
const { Client, LocalAuth } = require('whatsapp-web.js');
import QRCode from 'qrcode';
import { WebSocketServer } from 'ws';
import type { Server } from 'http';
import fs from 'fs';
import path from 'path';

interface PersistentWhatsAppSession {
  id: string;
  userId: string;
  phoneNumber?: string;
  qrCode?: string;
  status: 'connecting' | 'qr_ready' | 'connected' | 'disconnected';
  socket?: any;
  client?: any;
  lastActivity: Date;
  authPath?: string;
}

class PersistentWhatsAppService {
  private sessions: Map<string, PersistentWhatsAppSession> = new Map();
  private wss?: WebSocketServer;
  private clients: Map<string, any> = new Map();

  async initializeWebSocket(httpServer: Server) {
    try {
      this.wss = new WebSocketServer({ 
        server: httpServer, 
        path: '/ws-persistent' 
      });

      console.log('Persistent WhatsApp WebSocket server initialized on /ws-persistent');

      // Load existing sessions asynchronously in background to not block server startup
      setTimeout(() => {
        this.loadPersistedSessions().catch(error => {
          console.error('Error loading persisted sessions in background:', error);
        });
      }, 1000); // Wait 1 second after server starts

      this.wss.on('connection', (ws) => {
        console.log('Persistent WhatsApp WebSocket connected');
        
        ws.on('message', async (message) => {
          try {
            const data = JSON.parse(message.toString());
            console.log('Received persistent WebSocket message:', data);
            await this.handleMessage(ws, data);
          } catch (error) {
            console.error('Persistent WebSocket error processing message:', error);
            try {
              ws.send(JSON.stringify({ 
                type: 'error', 
                message: 'Invalid message format',
                error: error.message 
              }));
            } catch (sendError) {
              console.error('Error sending WebSocket error message:', sendError);
            }
          }
        });

        ws.on('error', (error) => {
          console.error('Persistent WebSocket error:', error);
        });

        ws.on('close', (code, reason) => {
          console.log('Persistent WhatsApp WebSocket disconnected:', code, reason?.toString());
        });
      });
    } catch (error) {
      console.error('Error initializing WebSocket server:', error);
    }
  }

  private async handleMessage(ws: any, data: any) {
    try {
      switch (data.type) {
        case 'connect':
          await this.connectSession(ws, data.userId);
          break;
        case 'disconnect':
          await this.disconnectSession(data.userId);
          break;
        case 'send_message':
          await this.sendMessage(data.userId, data.to, data.message);
          break;
        case 'get_sessions':
          await this.getSessions(ws, data.userId);
          break;
        default:
          ws.send(JSON.stringify({ 
            type: 'error', 
            message: 'Unknown message type' 
          }));
      }
    } catch (error) {
      console.error('Error handling message:', error);
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Error processing request',
        error: error.message 
      }));
    }
  }

  private async connectSession(ws: any, userId: string) {
    try {
      const sessionId = `session_${userId}`;
      
      // Check if session already exists
      if (this.sessions.has(sessionId)) {
        const session = this.sessions.get(sessionId)!;
        if (session.status === 'connected') {
          ws.send(JSON.stringify({
            type: 'already_connected',
            sessionId,
            phoneNumber: session.phoneNumber
          }));
          return;
        }
      }

      // Create new session
      const authPath = path.join(process.cwd(), '.wwebjs_auth', sessionId);
      
      const session: PersistentWhatsAppSession = {
        id: sessionId,
        userId,
        status: 'connecting',
        socket: ws,
        lastActivity: new Date(),
        authPath
      };

      this.sessions.set(sessionId, session);

      // Create WhatsApp client
      const client = new Client({
        authStrategy: new LocalAuth({
          clientId: sessionId,
          dataPath: authPath
        }),
        puppeteer: {
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
          ]
        }
      });

      session.client = client;
      this.clients.set(sessionId, client);

      // Set up client event handlers
      client.on('qr', async (qr) => {
        try {
          const qrCodeDataURL = await QRCode.toDataURL(qr);
          session.qrCode = qrCodeDataURL;
          session.status = 'qr_ready';
          
          ws.send(JSON.stringify({
            type: 'qr_code',
            sessionId,
            qrCode: qrCodeDataURL
          }));
        } catch (error) {
          console.error('Error generating QR code:', error);
        }
      });

      client.on('ready', () => {
        session.status = 'connected';
        session.phoneNumber = client.info?.wid?.user;
        session.lastActivity = new Date();
        
        ws.send(JSON.stringify({
          type: 'connected',
          sessionId,
          phoneNumber: session.phoneNumber
        }));

        this.saveSessionData(session);
      });

      client.on('authenticated', () => {
        console.log('Client authenticated for session:', sessionId);
      });

      client.on('auth_failure', (msg) => {
        console.error('Authentication failed for session:', sessionId, msg);
        session.status = 'disconnected';
        
        ws.send(JSON.stringify({
          type: 'auth_failure',
          sessionId,
          message: msg
        }));
      });

      client.on('disconnected', (reason) => {
        console.log('Client disconnected for session:', sessionId, reason);
        session.status = 'disconnected';
        
        ws.send(JSON.stringify({
          type: 'disconnected',
          sessionId,
          reason
        }));
      });

      // Initialize client
      await client.initialize();

    } catch (error) {
      console.error('Error connecting session:', error);
      ws.send(JSON.stringify({
        type: 'connection_error',
        message: error.message
      }));
    }
  }

  private async disconnectSession(userId: string) {
    const sessionId = `session_${userId}`;
    const session = this.sessions.get(sessionId);
    
    if (session && session.client) {
      try {
        await session.client.destroy();
        this.clients.delete(sessionId);
        this.sessions.delete(sessionId);
        
        if (session.socket) {
          session.socket.send(JSON.stringify({
            type: 'session_disconnected',
            sessionId
          }));
        }
      } catch (error) {
        console.error('Error disconnecting session:', error);
      }
    }
  }

  private async sendMessage(userId: string, to: string, message: string) {
    const sessionId = `session_${userId}`;
    const session = this.sessions.get(sessionId);
    
    if (!session || !session.client || session.status !== 'connected') {
      throw new Error('Session not connected');
    }

    try {
      const chatId = to.includes('@') ? to : `${to}@c.us`;
      await session.client.sendMessage(chatId, message);
      
      session.lastActivity = new Date();
      
      if (session.socket) {
        session.socket.send(JSON.stringify({
          type: 'message_sent',
          sessionId,
          to: chatId,
          message
        }));
      }
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  private async getSessions(ws: any, userId: string) {
    const sessionId = `session_${userId}`;
    const session = this.sessions.get(sessionId);
    
    ws.send(JSON.stringify({
      type: 'sessions_list',
      sessions: session ? [{
        id: session.id,
        status: session.status,
        phoneNumber: session.phoneNumber,
        lastActivity: session.lastActivity
      }] : []
    }));
  }

  private async saveSessionData(session: PersistentWhatsAppSession) {
    try {
      const sessionDataPath = path.join(process.cwd(), '.wwebjs_sessions');
      if (!fs.existsSync(sessionDataPath)) {
        fs.mkdirSync(sessionDataPath, { recursive: true });
      }
      
      const sessionFile = path.join(sessionDataPath, `${session.id}.json`);
      const sessionData = {
        id: session.id,
        userId: session.userId,
        phoneNumber: session.phoneNumber,
        status: session.status,
        lastActivity: session.lastActivity,
        authPath: session.authPath
      };
      
      fs.writeFileSync(sessionFile, JSON.stringify(sessionData, null, 2));
    } catch (error) {
      console.error('Error saving session data:', error);
    }
  }

  private async loadPersistedSessions() {
    try {
      const sessionDataPath = path.join(process.cwd(), '.wwebjs_sessions');
      if (!fs.existsSync(sessionDataPath)) {
        return;
      }
      
      const sessionFiles = fs.readdirSync(sessionDataPath);
      
      for (const file of sessionFiles) {
        if (file.endsWith('.json')) {
          try {
            const sessionFile = path.join(sessionDataPath, file);
            const sessionData = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
            
            // Only load sessions that were recently active (within last 24 hours)
            const lastActivity = new Date(sessionData.lastActivity);
            const now = new Date();
            const hoursDiff = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);
            
            if (hoursDiff < 24) {
              const session: PersistentWhatsAppSession = {
                ...sessionData,
                status: 'disconnected', // Start as disconnected, will reconnect when needed
                lastActivity: new Date(sessionData.lastActivity)
              };
              
              this.sessions.set(session.id, session);
              console.log('Loaded persisted session:', session.id);
            }
          } catch (error) {
            console.error('Error loading session file:', file, error);
          }
        }
      }
    } catch (error) {
      console.error('Error loading persisted sessions:', error);
    }
  }

  // Cleanup inactive sessions periodically
  private startCleanupTimer() {
    setInterval(() => {
      const now = new Date();
      
      for (const [sessionId, session] of this.sessions.entries()) {
        const hoursSinceActivity = (now.getTime() - session.lastActivity.getTime()) / (1000 * 60 * 60);
        
        // Disconnect sessions inactive for more than 2 hours
        if (hoursSinceActivity > 2 && session.status === 'connected') {
          this.disconnectSession(session.userId).catch(error => {
            console.error('Error during cleanup disconnect:', error);
          });
        }
        
        // Remove sessions inactive for more than 24 hours
        if (hoursSinceActivity > 24) {
          this.sessions.delete(sessionId);
          this.clients.delete(sessionId);
        }
      }
    }, 60 * 60 * 1000); // Run every hour
  }

  public initialize() {
    this.startCleanupTimer();
  }
}

export const persistentWhatsAppService = new PersistentWhatsAppService();