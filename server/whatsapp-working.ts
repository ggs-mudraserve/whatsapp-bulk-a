// Baileys imports removed - using whatsapp-web.js instead
import { Boom } from '@hapi/boom';
import QRCode from 'qrcode';
import { WebSocketServer } from 'ws';
import type { Server } from 'http';
import fs from 'fs';
import path from 'path';

interface WorkingWhatsAppSession {
  id: string;
  userId: string;
  phoneNumber?: string;
  qrCode?: string;
  status: 'connecting' | 'qr_ready' | 'connected' | 'disconnected';
  socket?: any;
  lastActivity: Date;
}

class WorkingWhatsAppService {
  private sessions: Map<string, WorkingWhatsAppSession> = new Map();
  private wss?: WebSocketServer;

  async initializeWebSocket(httpServer: Server) {
    this.wss = new WebSocketServer({ 
      server: httpServer, 
      path: '/ws-working' 
    });

    console.log('Working WhatsApp WebSocket server initialized on /ws-working');

    this.wss.on('connection', (ws) => {
      console.log('Working WhatsApp WebSocket connected');
      
      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message.toString());
          console.log('Received working WebSocket message:', data);
          await this.handleMessage(ws, data);
        } catch (error) {
          console.error('Working WebSocket error processing message:', error);
          ws.send(JSON.stringify({ 
            type: 'error', 
            message: 'Invalid message format',
            error: error.message 
          }));
        }
      });

      ws.on('error', (error) => {
        console.error('Working WebSocket error:', error);
      });

      ws.on('close', (code, reason) => {
        console.log('Working WhatsApp WebSocket disconnected:', code, reason?.toString());
      });
    });
  }

  private async handleMessage(ws: any, data: any) {
    const { type, sessionId, userId } = data;
    console.log('Processing working WebSocket message:', { type, sessionId, userId });

    switch (type) {
      case 'connect':
        await this.createWorkingSession(sessionId, userId || 'anonymous', ws);
        break;
      case 'disconnect':
        await this.disconnectSession(sessionId);
        break;
      default:
        console.log('Unknown message type:', type);
    }
  }

  async createWorkingSession(sessionId: string, userId: string, ws: any) {
    try {
      console.log(`Creating working WhatsApp session for user ${userId}`);
      
      // Clear any existing session
      if (this.sessions.has(sessionId)) {
        await this.disconnectSession(sessionId);
      }

      // Clean auth directory
      const authDir = path.join(process.cwd(), `auth_info_working_${sessionId}`);
      try {
        if (fs.existsSync(authDir)) {
          fs.rmSync(authDir, { recursive: true, force: true });
          console.log('Cleaned auth directory:', authDir);
        }
      } catch (e) {
        console.log('Auth cleanup not needed');
      }

      // Create session
      const session: WorkingWhatsAppSession = {
        id: sessionId,
        userId,
        status: 'connecting',
        lastActivity: new Date()
      };
      this.sessions.set(sessionId, session);

      // Send connecting status immediately
      ws.send(JSON.stringify({
        type: 'connecting',
        sessionId,
        message: 'Connecting to WhatsApp...'
      }));

      // Get WhatsApp version with fallback
      let version;
      try {
        const versionInfo = await fetchLatestBaileysVersion();
        version = versionInfo.version;
        console.log(`Using WhatsApp version: ${version.join('.')}`);
      } catch (error) {
        version = [2, 2412, 54]; // Stable fallback version
        console.log(`Using fallback WhatsApp version: ${version.join('.')}`);
      }

      // Setup auth state
      const { state, saveCreds } = await useMultiFileAuthState(authDir);

      // Create socket with minimal, stable configuration
      const socket = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        browser: ['WhatsApp Web', 'Chrome', '4.0.0'],
        generateHighQualityLinkPreview: false,
        markOnlineOnConnect: false,
        syncFullHistory: false,
        defaultQueryTimeoutMs: 30000,
        connectTimeoutMs: 30000,
        qrTimeout: 45000,
        retryRequestDelayMs: 1000,
        maxMsgRetryCount: 2,
        keepAliveIntervalMs: 30000,
        logger: {
          level: 'silent',
          child: () => ({ 
            level: 'silent',
            child: () => ({} as any),
            info: () => {},
            warn: () => {},
            error: () => {},
            debug: () => {},
            trace: () => {},
            fatal: () => {}
          }),
          info: () => {},
          warn: () => {},
          error: () => {},
          debug: () => {},
          trace: () => {},
          fatal: () => {}
        }
      });

      session.socket = socket;
      this.sessions.set(sessionId, session);

      // Handle connection updates
      socket.ev.on('connection.update', async (update) => {
        try {
          const { connection, lastDisconnect, qr } = update;
          console.log('Connection update:', { connection, qr: !!qr });

          if (qr) {
            console.log('QR Code generated for session:', sessionId);
            try {
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

              ws.send(JSON.stringify({
                type: 'qr_ready',
                sessionId,
                qrCode: qrCodeDataUrl,
                message: 'Scan this QR code with your WhatsApp'
              }));
            } catch (qrError) {
              console.error('QR code generation error:', qrError);
              ws.send(JSON.stringify({
                type: 'error',
                sessionId,
                message: 'Failed to generate QR code'
              }));
            }
          }

          if (connection === 'open') {
            console.log('WhatsApp connected for session:', sessionId);
            const phoneNumber = socket.user?.id?.split(':')[0] || 'Unknown';
            
            session.status = 'connected';
            session.phoneNumber = phoneNumber;
            session.lastActivity = new Date();
            this.sessions.set(sessionId, session);

            ws.send(JSON.stringify({
              type: 'connected',
              sessionId,
              phoneNumber,
              message: 'WhatsApp connected successfully!'
            }));
          }

          if (connection === 'close') {
            console.log('WhatsApp connection closed for session:', sessionId);
            let shouldReconnect = false;
            let errorMessage = 'Connection closed';

            if (lastDisconnect?.error) {
              const statusCode = (lastDisconnect.error as Boom)?.output?.statusCode;
              console.log('Disconnect reason:', statusCode);

              switch (statusCode) {
                case DisconnectReason.badSession:
                  errorMessage = 'Bad session. Please reconnect.';
                  break;
                case DisconnectReason.connectionClosed:
                  errorMessage = 'Connection closed. Attempting to reconnect...';
                  shouldReconnect = true;
                  break;
                case DisconnectReason.connectionLost:
                  errorMessage = 'Connection lost. Attempting to reconnect...';
                  shouldReconnect = true;
                  break;
                case DisconnectReason.connectionReplaced:
                  errorMessage = 'Connection replaced by another session.';
                  break;
                case DisconnectReason.loggedOut:
                  errorMessage = 'Logged out from WhatsApp.';
                  break;
                case DisconnectReason.restartRequired:
                  errorMessage = 'Restart required.';
                  break;
                case DisconnectReason.timedOut:
                  errorMessage = 'Connection timed out.';
                  break;
                default:
                  errorMessage = 'Unknown disconnect reason.';
              }
            }

            session.status = 'disconnected';
            session.lastActivity = new Date();
            this.sessions.set(sessionId, session);

            if (shouldReconnect) {
              // Don't auto-reconnect for now to avoid loops
              ws.send(JSON.stringify({
                type: 'disconnected',
                sessionId,
                message: errorMessage,
                canRetry: true
              }));
            } else {
              ws.send(JSON.stringify({
                type: 'disconnected',
                sessionId,
                message: errorMessage,
                canRetry: false
              }));
            }
          }
        } catch (updateError) {
          console.error('Error handling connection update:', updateError);
          ws.send(JSON.stringify({
            type: 'error',
            sessionId,
            message: 'Connection update failed'
          }));
        }
      });

      // Handle credentials update
      socket.ev.on('creds.update', saveCreds);

    } catch (error) {
      console.error('Error creating working session:', error);
      ws.send(JSON.stringify({
        type: 'error',
        sessionId,
        message: `Failed to create session: ${error.message}`
      }));
    }
  }

  async disconnectSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (session?.socket) {
      try {
        await session.socket.logout();
      } catch (e) {
        console.log('Socket already closed');
      }
      session.socket = null;
    }
    this.sessions.delete(sessionId);
    
    // Clean up auth directory
    const authDir = path.join(process.cwd(), `auth_info_working_${sessionId}`);
    try {
      if (fs.existsSync(authDir)) {
        fs.rmSync(authDir, { recursive: true, force: true });
        console.log('Cleaned up auth directory:', authDir);
      }
    } catch (e) {
      console.log('Cleanup not needed');
    }
  }

  getSession(sessionId: string): WorkingWhatsAppSession | undefined {
    return this.sessions.get(sessionId);
  }

  getAllSessions(): WorkingWhatsAppSession[] {
    return Array.from(this.sessions.values());
  }

  async sendMessage(sessionId: string, to: string, message: string) {
    const session = this.sessions.get(sessionId);
    if (!session?.socket) {
      throw new Error('Session not found or not connected');
    }

    try {
      const result = await session.socket.sendMessage(to, { text: message });
      return result;
    } catch (error) {
      console.error('Send message error:', error);
      throw error;
    }
  }
}

export const workingWhatsAppService = new WorkingWhatsAppService();