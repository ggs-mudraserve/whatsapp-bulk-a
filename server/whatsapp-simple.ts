import { makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import QRCode from 'qrcode';
import { WebSocketServer } from 'ws';
import type { Server } from 'http';
import { storage } from './storage';

interface SimpleWhatsAppSession {
  id: string;
  userId: string;
  phoneNumber?: string;
  qrCode?: string;
  status: 'connecting' | 'qr_ready' | 'connected' | 'disconnected';
  socket?: any;
  lastActivity?: Date;
}

class SimpleWhatsAppService {
  private sessions: Map<string, SimpleWhatsAppSession> = new Map();
  private wss?: WebSocketServer;
  private rateLimitMap: Map<string, number> = new Map();
  private readonly RATE_LIMIT_DELAY = 10 * 60 * 1000; // 10 minutes

  async initializeWebSocket(httpServer: Server) {
    this.wss = new WebSocketServer({ 
      server: httpServer, 
      path: '/ws' 
    });

    this.wss.on('connection', (ws) => {
      console.log('WhatsApp WebSocket connected');
      
      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message.toString());
          await this.handleMessage(ws, data);
        } catch (error) {
          console.error('WebSocket error:', error);
          ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
        }
      });

      ws.on('close', () => {
        console.log('WhatsApp WebSocket disconnected');
      });
    });
  }

  private async handleMessage(ws: any, data: any) {
    const { type, sessionId, userId } = data;

    switch (type) {
      case 'connect':
        await this.createSession(sessionId, userId, ws);
        break;
      case 'disconnect':
        await this.disconnectSession(sessionId);
        break;
    }
  }

  async createSession(sessionId: string, userId: string, ws: any) {
    try {
      console.log(`Creating WhatsApp session for user ${userId}`);
      
      // Check rate limiting
      const lastAttempt = this.rateLimitMap.get(userId) || 0;
      const now = Date.now();
      
      if (now - lastAttempt < this.RATE_LIMIT_DELAY) {
        const waitTime = Math.ceil((this.RATE_LIMIT_DELAY - (now - lastAttempt)) / 60000);
        ws.send(JSON.stringify({
          type: 'error',
          message: `Please wait ${waitTime} minutes before trying again to avoid rate limiting.`
        }));
        return;
      }

      this.rateLimitMap.set(userId, now);

      // Clear any existing session
      if (this.sessions.has(sessionId)) {
        await this.disconnectSession(sessionId);
      }

      // Clean auth directory
      const authDir = `./auth_info_${sessionId}`;
      try {
        const fs = await import('fs');
        if (fs.existsSync(authDir)) {
          fs.rmSync(authDir, { recursive: true, force: true });
        }
      } catch (e) {
        console.log('Auth cleanup not needed');
      }

      // Create session
      const session: SimpleWhatsAppSession = {
        id: sessionId,
        userId,
        status: 'connecting',
        lastActivity: new Date()
      };
      this.sessions.set(sessionId, session);

      // Get latest WhatsApp version
      const { version } = await fetchLatestBaileysVersion();
      console.log(`Using WhatsApp version: ${version.join('.')}`);

      // Setup auth state
      const { state, saveCreds } = await useMultiFileAuthState(authDir);

      // Create socket with minimal configuration
      const socket = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        browser: ['Chrome', 'Linux', '4.0.0'],
        generateHighQualityLinkPreview: true,
        markOnlineOnConnect: false,
        syncFullHistory: false,
        defaultQueryTimeoutMs: 30000,
        connectTimeoutMs: 30000,
        qrTimeout: 30000,
        logger: {
          level: 'silent',
          child: () => ({ 
            level: 'silent',
            child: () => ({} as any),
            info: () => {},
            warn: () => {},
            error: () => {},
            debug: () => {},
            trace: () => {}
          }),
          info: () => {},
          warn: () => {},
          error: () => {},
          debug: () => {},
          trace: () => {}
        }
      });

      session.socket = socket;
      this.sessions.set(sessionId, session);

      // Send connecting status
      ws.send(JSON.stringify({
        type: 'connecting',
        sessionId,
        message: 'Connecting to WhatsApp...'
      }));

      // Handle connection updates
      socket.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          console.log('QR Code generated for session:', sessionId);
          const qrCodeDataUrl = await QRCode.toDataURL(qr);
          
          session.qrCode = qrCodeDataUrl;
          session.status = 'qr_ready';
          this.sessions.set(sessionId, session);

          ws.send(JSON.stringify({
            type: 'qr_ready',
            sessionId,
            qrCode: qrCodeDataUrl,
            message: 'Scan this QR code with your WhatsApp'
          }));
        }

        if (connection === 'open') {
          console.log('WhatsApp connected successfully for session:', sessionId);
          
          session.status = 'connected';
          session.phoneNumber = socket.user?.id.replace(':0@s.whatsapp.net', '');
          this.sessions.set(sessionId, session);

          ws.send(JSON.stringify({
            type: 'connected',
            sessionId,
            phoneNumber: session.phoneNumber,
            message: 'WhatsApp connected successfully!'
          }));

          // Save number to database
          if (session.phoneNumber) {
            try {
              await storage.createWhatsappNumber({
                userId,
                phoneNumber: session.phoneNumber,
                status: 'connected'
              });
            } catch (error) {
              console.error('Error saving WhatsApp number:', error);
            }
          }
        }

        if (connection === 'close') {
          const error = lastDisconnect?.error as Boom;
          const statusCode = error?.output?.statusCode;
          
          console.log('Connection closed:', statusCode);
          
          session.status = 'disconnected';
          this.sessions.set(sessionId, session);

          let message = 'Connection closed';
          
          if (statusCode === DisconnectReason.loggedOut) {
            message = 'WhatsApp logged out. Please scan QR code again.';
          } else if (statusCode === 401 || statusCode === 515) {
            message = 'WhatsApp blocked this connection. Please wait 10 minutes and try again.';
            this.rateLimitMap.set(userId, Date.now());
          } else if (statusCode === DisconnectReason.badSession) {
            message = 'Invalid session. Please scan QR code again.';
          } else {
            message = 'Connection lost. Please try again.';
          }

          ws.send(JSON.stringify({
            type: 'disconnected',
            sessionId,
            message
          }));
        }
      });

      // Handle credentials update
      socket.ev.on('creds.update', saveCreds);

      // Setup timeout
      setTimeout(() => {
        if (session.status === 'connecting') {
          console.log('Connection timeout for session:', sessionId);
          ws.send(JSON.stringify({
            type: 'error',
            sessionId,
            message: 'Connection timeout. Please try again.'
          }));
          socket.end(undefined);
        }
      }, 30000);

    } catch (error) {
      console.error('Error creating WhatsApp session:', error);
      ws.send(JSON.stringify({
        type: 'error',
        sessionId,
        message: 'Failed to create WhatsApp session. Please try again.'
      }));
    }
  }

  async disconnectSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (session && session.socket) {
      try {
        session.socket.end();
        session.status = 'disconnected';
        this.sessions.set(sessionId, session);
        console.log('Session disconnected:', sessionId);
      } catch (error) {
        console.error('Error disconnecting session:', error);
      }
    }
  }

  getSession(sessionId: string): SimpleWhatsAppSession | undefined {
    return this.sessions.get(sessionId);
  }

  getAllSessions(): SimpleWhatsAppSession[] {
    return Array.from(this.sessions.values());
  }

  async sendMessage(sessionId: string, to: string, message: string) {
    const session = this.sessions.get(sessionId);
    if (!session || !session.socket || session.status !== 'connected') {
      throw new Error('WhatsApp session not connected');
    }

    try {
      await session.socket.sendMessage(to, { text: message });
      return { success: true, message: 'Message sent successfully' };
    } catch (error) {
      console.error('Error sending message:', error);
      throw new Error('Failed to send message');
    }
  }
}

export const simpleWhatsAppService = new SimpleWhatsAppService();