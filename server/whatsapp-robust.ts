import { makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import QRCode from 'qrcode';
import { WebSocketServer } from 'ws';
import type { Server } from 'http';
import { storage } from './storage';
import NodeCache from 'node-cache';

interface RobustWhatsAppSession {
  id: string;
  userId: string;
  phoneNumber?: string;
  qrCode?: string;
  status: 'connecting' | 'qr_ready' | 'connected' | 'disconnected' | 'blocked';
  socket?: any;
  lastActivity?: Date;
  retryCount: number;
  cooldownUntil?: Date;
}

class RobustWhatsAppService {
  private sessions: Map<string, RobustWhatsAppSession> = new Map();
  private wss?: WebSocketServer;
  private globalCooldowns: Map<string, Date> = new Map();
  private connectionAttempts: Map<string, number> = new Map();
  private msgRetryCounterCache = new NodeCache();
  private readonly COOLDOWN_DURATION = 30 * 60 * 1000; // 30 minutes
  private readonly MAX_RETRY_ATTEMPTS = 2;

  async initializeWebSocket(httpServer: Server) {
    this.wss = new WebSocketServer({ 
      server: httpServer, 
      path: '/ws-robust' 
    });

    this.wss.on('connection', (ws) => {
      console.log('Robust WhatsApp WebSocket connected');
      
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
        console.log('Robust WhatsApp WebSocket disconnected');
      });
    });
  }

  private async handleMessage(ws: any, data: any) {
    const { type, sessionId, userId } = data;
    console.log('Received robust WebSocket message:', { type, sessionId, userId });

    switch (type) {
      case 'connect':
        await this.createRobustSession(sessionId, userId || 'anonymous', ws);
        break;
      case 'disconnect':
        await this.disconnectSession(sessionId);
        break;
      case 'check_cooldown':
        await this.checkCooldownStatus(userId, ws);
        break;
      default:
        console.log('Unknown message type:', type);
    }
  }

  private async checkCooldownStatus(userId: string, ws: any) {
    const cooldownUntil = this.globalCooldowns.get(userId);
    const now = new Date();
    
    if (cooldownUntil && cooldownUntil > now) {
      const remainingMinutes = Math.ceil((cooldownUntil.getTime() - now.getTime()) / 60000);
      ws.send(JSON.stringify({
        type: 'cooldown_active',
        remainingMinutes,
        message: `Please wait ${remainingMinutes} minutes before trying again`
      }));
    } else {
      ws.send(JSON.stringify({
        type: 'cooldown_clear',
        message: 'You can now attempt to connect'
      }));
    }
  }

  async createRobustSession(sessionId: string, userId: string, ws: any) {
    try {
      console.log(`Creating robust WhatsApp session for user ${userId}`);
      
      // Check global cooldown
      const cooldownUntil = this.globalCooldowns.get(userId);
      const now = new Date();
      
      if (cooldownUntil && cooldownUntil > now) {
        const remainingMinutes = Math.ceil((cooldownUntil.getTime() - now.getTime()) / 60000);
        ws.send(JSON.stringify({
          type: 'error',
          sessionId,
          message: `Account temporarily blocked. Please wait ${remainingMinutes} minutes before trying again.`,
          cooldownActive: true,
          remainingMinutes
        }));
        return;
      }

      // Clear any existing session
      if (this.sessions.has(sessionId)) {
        await this.disconnectSession(sessionId);
      }

      // Get current attempt count
      const currentAttempts = this.connectionAttempts.get(userId) || 0;
      if (currentAttempts >= this.MAX_RETRY_ATTEMPTS) {
        // Set cooldown
        const cooldownEnd = new Date(Date.now() + this.COOLDOWN_DURATION);
        this.globalCooldowns.set(userId, cooldownEnd);
        this.connectionAttempts.delete(userId);
        
        ws.send(JSON.stringify({
          type: 'error',
          sessionId,
          message: 'Too many connection attempts. Please wait 30 minutes before trying again.',
          cooldownActive: true,
          remainingMinutes: 30
        }));
        return;
      }

      // Increment attempt count
      this.connectionAttempts.set(userId, currentAttempts + 1);

      // Clean auth directory with more robust method
      const authDir = `./auth_info_robust_${sessionId}`;
      await this.cleanAuthDirectory(authDir);

      // Create session
      const session: RobustWhatsAppSession = {
        id: sessionId,
        userId,
        status: 'connecting',
        lastActivity: new Date(),
        retryCount: currentAttempts
      };
      this.sessions.set(sessionId, session);

      // Get latest WhatsApp version with fallback
      let version;
      try {
        const versionInfo = await fetchLatestBaileysVersion();
        version = versionInfo.version;
        console.log(`Using WhatsApp version: ${version.join('.')}`);
      } catch (error) {
        // Fallback to a known stable version
        version = [2, 2412, 54];
        console.log(`Using fallback WhatsApp version: ${version.join('.')}`);
      }

      // Setup auth state
      const { state, saveCreds } = await useMultiFileAuthState(authDir);

      // Create socket with ultra-stable configuration
      const socket = makeWASocket({
        version,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, this.msgRetryCounterCache)
        },
        printQRInTerminal: false,
        browser: ['WhatsApp Marketing Pro', 'Chrome', '110.0.0.0'],
        generateHighQualityLinkPreview: false,
        markOnlineOnConnect: false,
        syncFullHistory: false,
        fireInitQueries: true,
        shouldSyncHistoryMessage: () => false,
        defaultQueryTimeoutMs: 90000,
        connectTimeoutMs: 90000,
        qrTimeout: 90000,
        retryRequestDelayMs: 2000,
        maxMsgRetryCount: 3,
        keepAliveIntervalMs: 15000,
        getMessage: async (key) => {
          return {
            conversation: 'WhatsApp Marketing Bot Message'
          };
        },
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

      // Send connecting status
      ws.send(JSON.stringify({
        type: 'connecting',
        sessionId,
        message: 'Establishing secure connection to WhatsApp...',
        attempt: currentAttempts + 1,
        maxAttempts: this.MAX_RETRY_ATTEMPTS
      }));

      // Handle connection updates with robust error handling
      socket.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          console.log('QR Code generated for robust session:', sessionId);
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
            this.sessions.set(sessionId, session);

            ws.send(JSON.stringify({
              type: 'qr_ready',
              sessionId,
              qrCode: qrCodeDataUrl,
              message: 'QR Code generated! Scan quickly with your WhatsApp',
              attempt: session.retryCount + 1
            }));
          } catch (qrError) {
            console.error('QR Code generation error:', qrError);
            ws.send(JSON.stringify({
              type: 'error',
              sessionId,
              message: 'Failed to generate QR code. Please try again.'
            }));
          }
        }

        if (connection === 'open') {
          console.log('WhatsApp connected successfully for robust session:', sessionId);
          
          // Reset attempt counter on successful connection
          this.connectionAttempts.delete(userId);
          this.globalCooldowns.delete(userId);
          
          session.status = 'connected';
          session.phoneNumber = socket.user?.id.replace(/:\d+@s\.whatsapp\.net$/, '');
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
              console.log('WhatsApp number saved to database:', session.phoneNumber);
            } catch (error) {
              console.error('Error saving WhatsApp number:', error);
            }
          }
        }

        if (connection === 'close') {
          await this.handleDisconnection(lastDisconnect, session, ws, sessionId, userId);
        }
      });

      // Handle credentials update
      socket.ev.on('creds.update', saveCreds);

      // Setup longer timeout
      setTimeout(() => {
        if (session.status === 'connecting') {
          console.log('Connection timeout for robust session:', sessionId);
          ws.send(JSON.stringify({
            type: 'error',
            sessionId,
            message: 'Connection timeout. This might indicate network issues or WhatsApp blocking.'
          }));
          socket.end(undefined);
        }
      }, 120000); // 2 minutes timeout

    } catch (error) {
      console.error('Error creating robust WhatsApp session:', error);
      ws.send(JSON.stringify({
        type: 'error',
        sessionId,
        message: 'Failed to create WhatsApp session. Please try again in a few minutes.'
      }));
    }
  }

  private async handleDisconnection(lastDisconnect: any, session: RobustWhatsAppSession, ws: any, sessionId: string, userId: string) {
    const error = lastDisconnect?.error as Boom;
    const statusCode = error?.output?.statusCode;
    
    console.log('Robust connection closed:', statusCode, 'Session was:', session.status);
    
    session.status = 'disconnected';
    this.sessions.set(sessionId, session);

    let message = 'Connection closed';
    let shouldBlock = false;
    let cooldownMinutes = 0;
    
    switch (statusCode) {
      case DisconnectReason.loggedOut:
        message = 'WhatsApp logged out. Please scan QR code again.';
        break;
        
      case 401:
        message = 'Authentication failed. Account temporarily blocked for 30 minutes.';
        shouldBlock = true;
        cooldownMinutes = 30;
        break;
        
      case 515:
        message = 'WhatsApp has blocked this connection. Account temporarily blocked for 30 minutes.';
        shouldBlock = true;
        cooldownMinutes = 30;
        session.status = 'blocked';
        break;
        
      case DisconnectReason.badSession:
        message = 'Invalid session. Please try again with a fresh connection.';
        break;
        
      case DisconnectReason.timedOut:
        message = 'Connection timed out. Please check your internet and try again.';
        break;
        
      case DisconnectReason.connectionClosed:
        message = 'Connection closed by WhatsApp. Please try again.';
        break;
        
      case DisconnectReason.connectionLost:
        message = 'Network connection lost. Please check your internet.';
        break;
        
      case DisconnectReason.restartRequired:
        message = 'WhatsApp restart required. Please try connecting again.';
        break;
        
      default:
        message = 'Connection lost due to unknown reason. Please try again.';
    }

    if (shouldBlock) {
      const cooldownEnd = new Date(Date.now() + cooldownMinutes * 60 * 1000);
      this.globalCooldowns.set(userId, cooldownEnd);
      this.connectionAttempts.delete(userId);
      
      ws.send(JSON.stringify({
        type: 'blocked',
        sessionId,
        message,
        cooldownActive: true,
        remainingMinutes: cooldownMinutes
      }));
    } else {
      ws.send(JSON.stringify({
        type: 'disconnected',
        sessionId,
        message,
        canRetry: !shouldBlock
      }));
    }
    
    // Auto cleanup auth files for problematic disconnections
    if (statusCode === 515 || statusCode === 401 || statusCode === DisconnectReason.badSession) {
      const authDir = `./auth_info_robust_${sessionId}`;
      await this.cleanAuthDirectory(authDir);
    }
  }

  private async cleanAuthDirectory(authDir: string) {
    try {
      const fs = await import('fs');
      if (fs.existsSync(authDir)) {
        fs.rmSync(authDir, { recursive: true, force: true });
        console.log('Cleaned auth directory:', authDir);
      }
    } catch (e) {
      console.log('Auth directory cleanup failed:', e);
    }
  }

  async disconnectSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (session && session.socket) {
      try {
        session.socket.end();
        session.status = 'disconnected';
        this.sessions.set(sessionId, session);
        console.log('Robust session disconnected:', sessionId);
      } catch (error) {
        console.error('Error disconnecting robust session:', error);
      }
    }
    this.sessions.delete(sessionId);
  }

  getSession(sessionId: string): RobustWhatsAppSession | undefined {
    return this.sessions.get(sessionId);
  }

  getAllSessions(): RobustWhatsAppSession[] {
    return Array.from(this.sessions.values());
  }

  getCooldownInfo(userId: string): { active: boolean; remainingMinutes: number } {
    const cooldownUntil = this.globalCooldowns.get(userId);
    const now = new Date();
    
    if (cooldownUntil && cooldownUntil > now) {
      return {
        active: true,
        remainingMinutes: Math.ceil((cooldownUntil.getTime() - now.getTime()) / 60000)
      };
    }
    
    return { active: false, remainingMinutes: 0 };
  }

  async sendMessage(sessionId: string, to: string, message: string) {
    const session = this.sessions.get(sessionId);
    if (!session || !session.socket || session.status !== 'connected') {
      throw new Error('WhatsApp session not connected');
    }

    try {
      await session.socket.sendMessage(to, { text: message });
      return { success: true };
    } catch (error) {
      console.error('Error sending message:', error);
      throw new Error('Failed to send message');
    }
  }
}

export const robustWhatsAppService = new RobustWhatsAppService();