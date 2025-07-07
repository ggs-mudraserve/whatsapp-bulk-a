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
    this.wss = new WebSocketServer({ 
      server: httpServer, 
      path: '/ws-persistent' 
    });

    console.log('Persistent WhatsApp WebSocket server initialized on /ws-persistent');

    // Load existing sessions on startup
    await this.loadPersistedSessions();

    this.wss.on('connection', (ws) => {
      console.log('Persistent WhatsApp WebSocket connected');
      
      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message.toString());
          console.log('Received persistent WebSocket message:', data);
          await this.handleMessage(ws, data);
        } catch (error) {
          console.error('Persistent WebSocket error processing message:', error);
          ws.send(JSON.stringify({ 
            type: 'error', 
            message: 'Invalid message format',
            error: error.message 
          }));
        }
      });

      ws.on('error', (error) => {
        console.error('Persistent WebSocket error:', error);
      });

      ws.on('close', (code, reason) => {
        console.log('Persistent WhatsApp WebSocket disconnected:', code, reason?.toString());
      });
    });
  }

  private async loadPersistedSessions() {
    try {
      console.log('Loading persisted WhatsApp sessions...');
      
      // Look for existing auth directories
      const authDirs = fs.readdirSync(process.cwd()).filter(dir => 
        dir.startsWith('auth_info_persistent_') && fs.statSync(dir).isDirectory()
      );

      console.log(`Found ${authDirs.length} existing auth directories`);

      for (const authDir of authDirs) {
        try {
          const sessionId = authDir.replace('auth_info_persistent_', '');
          const sessionPath = path.join(process.cwd(), authDir);
          
          // Extract userId from session metadata if exists
          const metadataPath = path.join(sessionPath, 'session_metadata.json');
          let userId = 'unknown';
          
          if (fs.existsSync(metadataPath)) {
            const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
            userId = metadata.userId || 'unknown';
          }

          console.log(`Restoring session ${sessionId} for user ${userId}`);
          await this.restoreSession(sessionId, userId, sessionPath);
        } catch (error) {
          console.error(`Failed to restore session from ${authDir}:`, error);
        }
      }
    } catch (error) {
      console.error('Error loading persisted sessions:', error);
    }
  }

  private async restoreSession(sessionId: string, userId: string, authPath: string) {
    try {
      const session: PersistentWhatsAppSession = {
        id: sessionId,
        userId,
        status: 'connecting',
        lastActivity: new Date(),
        authPath
      };

      this.sessions.set(sessionId, session);

      // Create client with persistent auth
      const client = new Client({
        authStrategy: new LocalAuth({
          clientId: sessionId,
          dataPath: authPath
        }),
        puppeteer: {
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding'
          ],
          executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium'
        },
        webVersionCache: {
          type: 'remote',
          remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
        }
      });

      this.clients.set(sessionId, client);
      session.client = client;

      // Set up event handlers
      this.setupClientEvents(client, session);

      // Initialize the client
      console.log(`Initializing restored client for session ${sessionId}`);
      await client.initialize();

    } catch (error) {
      console.error(`Failed to restore session ${sessionId}:`, error);
      this.sessions.delete(sessionId);
    }
  }

  private async handleMessage(ws: any, data: any) {
    const { type, sessionId, userId } = data;
    console.log('Processing persistent WebSocket message:', { type, sessionId, userId });

    switch (type) {
      case 'connect':
        await this.createPersistentSession(sessionId, userId || 'anonymous', ws);
        break;
      case 'disconnect':
        await this.disconnectSession(sessionId);
        break;
      case 'check_status':
        await this.checkSessionStatus(sessionId, ws);
        break;
      default:
        console.log('Unknown message type:', type);
    }
  }

  private async checkSessionStatus(sessionId: string, ws: any) {
    const session = this.sessions.get(sessionId);
    if (session) {
      ws.send(JSON.stringify({
        type: 'status_update',
        sessionId,
        status: session.status,
        phoneNumber: session.phoneNumber,
        message: `Session status: ${session.status}`
      }));
    } else {
      ws.send(JSON.stringify({
        type: 'status_update',
        sessionId,
        status: 'disconnected',
        message: 'Session not found'
      }));
    }
  }

  async createPersistentSession(sessionId: string, userId: string, ws: any) {
    try {
      console.log(`Creating persistent WhatsApp session for user ${userId}, session: ${sessionId}`);
      
      // Check if session already exists and is connected
      const existingSession = this.sessions.get(sessionId);
      if (existingSession && existingSession.status === 'connected') {
        console.log(`Session ${sessionId} already connected`);
        ws.send(JSON.stringify({
          type: 'already_connected',
          sessionId,
          phoneNumber: existingSession.phoneNumber,
          message: 'Session already connected'
        }));
        return;
      }

      // Disconnect existing session if any
      if (existingSession) {
        await this.disconnectSession(sessionId);
      }

      // Create auth directory
      const authPath = path.join(process.cwd(), `auth_info_persistent_${sessionId}`);
      
      // Save session metadata
      const metadataPath = path.join(authPath, 'session_metadata.json');
      fs.mkdirSync(authPath, { recursive: true });
      fs.writeFileSync(metadataPath, JSON.stringify({ 
        userId, 
        sessionId, 
        createdAt: new Date().toISOString() 
      }));

      // Create session
      const session: PersistentWhatsAppSession = {
        id: sessionId,
        userId,
        status: 'connecting',
        lastActivity: new Date(),
        authPath,
        socket: ws
      };
      this.sessions.set(sessionId, session);

      // Send connecting status immediately
      ws.send(JSON.stringify({
        type: 'connecting',
        sessionId,
        message: 'Initializing WhatsApp connection...'
      }));

      // Create WhatsApp client with persistent auth
      const client = new Client({
        authStrategy: new LocalAuth({
          clientId: sessionId,
          dataPath: authPath
        }),
        puppeteer: {
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding'
          ],
          executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium'
        },
        webVersionCache: {
          type: 'remote',
          remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
        }
      });

      this.clients.set(sessionId, client);
      session.client = client;

      // Set up event handlers
      this.setupClientEvents(client, session);

      // Initialize the client
      console.log(`Initializing WhatsApp client for session ${sessionId}`);
      await client.initialize();

    } catch (error) {
      console.error('Error creating persistent session:', error);
      const session = this.sessions.get(sessionId);
      if (session?.socket) {
        session.socket.send(JSON.stringify({
          type: 'error',
          sessionId,
          message: 'Failed to create WhatsApp session',
          error: error.message
        }));
      }
    }
  }

  private setupClientEvents(client: any, session: PersistentWhatsAppSession) {
    const { id: sessionId } = session;

    client.on('qr', async (qr: string) => {
      try {
        console.log(`QR Code generated for session ${sessionId}`);
        
        const qrCodeDataUrl = await QRCode.toDataURL(qr, {
          width: 256,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        
        session.qrCode = qrCodeDataUrl;
        session.status = 'qr_ready';
        session.lastActivity = new Date();
        this.sessions.set(sessionId, session);

        if (session.socket) {
          session.socket.send(JSON.stringify({
            type: 'qr_ready',
            sessionId,
            qrCode: qrCodeDataUrl,
            message: 'Scan this QR code with your WhatsApp'
          }));
        }

        // Broadcast to all websockets for this session
        this.broadcastToSession(sessionId, {
          type: 'qr_ready',
          sessionId,
          qrCode: qrCodeDataUrl
        });

      } catch (error) {
        console.error('QR code generation error:', error);
        if (session.socket) {
          session.socket.send(JSON.stringify({
            type: 'error',
            sessionId,
            message: 'Failed to generate QR code'
          }));
        }
      }
    });

    client.on('ready', () => {
      console.log(`WhatsApp client ready for session ${sessionId}`);
      
      const info = client.info;
      session.phoneNumber = info.wid.user;
      session.status = 'connected';
      session.lastActivity = new Date();
      this.sessions.set(sessionId, session);

      if (session.socket) {
        session.socket.send(JSON.stringify({
          type: 'connected',
          sessionId,
          phoneNumber: session.phoneNumber,
          message: 'WhatsApp connected successfully!'
        }));
      }

      // Broadcast to all websockets
      this.broadcastToSession(sessionId, {
        type: 'connected',
        sessionId,
        phoneNumber: session.phoneNumber
      });
    });

    client.on('authenticated', () => {
      console.log(`WhatsApp client authenticated for session ${sessionId}`);
    });

    client.on('auth_failure', (msg: string) => {
      console.error(`WhatsApp auth failure for session ${sessionId}:`, msg);
      session.status = 'disconnected';
      this.sessions.set(sessionId, session);

      if (session.socket) {
        session.socket.send(JSON.stringify({
          type: 'auth_failure',
          sessionId,
          message: 'Authentication failed. Please try again.'
        }));
      }
    });

    client.on('disconnected', (reason: string) => {
      console.log(`WhatsApp client disconnected for session ${sessionId}:`, reason);
      session.status = 'disconnected';
      this.sessions.set(sessionId, session);

      this.broadcastToSession(sessionId, {
        type: 'disconnected',
        sessionId,
        reason
      });
    });

    client.on('message', async (message: any) => {
      try {
        console.log(`Received message in session ${sessionId}:`, message.body);
        
        // TODO: Save message to database
        // This would integrate with your existing message storage system
        
      } catch (error) {
        console.error('Error processing received message:', error);
      }
    });
  }

  private broadcastToSession(sessionId: string, data: any) {
    if (this.wss) {
      this.wss.clients.forEach((client) => {
        if (client.readyState === 1) { // WebSocket.OPEN
          client.send(JSON.stringify(data));
        }
      });
    }
  }

  async disconnectSession(sessionId: string) {
    console.log(`Disconnecting session ${sessionId}`);
    
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'disconnected';
      
      // Clean up client
      const client = this.clients.get(sessionId);
      if (client) {
        try {
          await client.destroy();
          console.log(`Client destroyed for session ${sessionId}`);
        } catch (error) {
          console.error(`Error destroying client for session ${sessionId}:`, error);
        }
        this.clients.delete(sessionId);
      }

      // Keep session data for potential reconnection
      // Don't remove auth files to enable persistence
      this.sessions.set(sessionId, session);
    }
  }

  getSession(sessionId: string): PersistentWhatsAppSession | undefined {
    return this.sessions.get(sessionId);
  }

  getAllSessions(): PersistentWhatsAppSession[] {
    return Array.from(this.sessions.values());
  }

  async sendMessage(sessionId: string, to: string, message: string) {
    console.log(`Attempting to send message via session ${sessionId} to ${to}: ${message}`);
    
    const client = this.clients.get(sessionId);
    const session = this.sessions.get(sessionId);

    if (!client || !session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (session.status !== 'connected') {
      throw new Error(`Session ${sessionId} is not connected (status: ${session.status})`);
    }

    try {
      // Format phone number for WhatsApp
      const chatId = to.includes('@') ? to : `${to}@c.us`;
      
      await client.sendMessage(chatId, message);
      console.log(`✓ Message sent successfully via session ${sessionId} to ${to}`);
      
      session.lastActivity = new Date();
      this.sessions.set(sessionId, session);
      
      return true;
    } catch (error) {
      console.error(`Failed to send message via session ${sessionId}:`, error);
      throw error;
    }
  }
}

export const persistentWhatsAppService = new PersistentWhatsAppService();