import { makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import QRCode from 'qrcode';
import { WebSocketServer } from 'ws';
import type { Server } from 'http';
import { storage } from './storage';

interface WhatsAppSession {
  id: string;
  userId: string;
  phoneNumber?: string;
  qrCode?: string;
  status: 'connecting' | 'qr_ready' | 'connected' | 'disconnected';
  socket?: any;
}

class WhatsAppService {
  private sessions: Map<string, WhatsAppSession> = new Map();
  private wss?: WebSocketServer;
  private lastAttempts: Map<string, number> = new Map();

  async initializeWebSocket(httpServer: Server) {
    this.wss = new WebSocketServer({ 
      server: httpServer, 
      path: '/ws' 
    });

    this.wss.on('connection', (ws, req) => {
      console.log('WhatsApp WebSocket client connected');
      
      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message.toString());
          await this.handleWebSocketMessage(ws, data);
        } catch (error) {
          console.error('WebSocket message error:', error);
          ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
        }
      });

      ws.on('close', () => {
        console.log('WhatsApp WebSocket client disconnected');
      });
    });
  }

  private async handleWebSocketMessage(ws: any, data: any) {
    const { type, sessionId, userId } = data;

    switch (type) {
      case 'start_whatsapp':
        await this.startWhatsAppSession(sessionId, userId, ws);
        break;
      case 'get_qr':
        await this.sendQRCode(sessionId, ws);
        break;
      case 'disconnect':
        await this.disconnectSession(sessionId);
        break;
    }
  }

  async startWhatsAppSession(sessionId: string, userId: string, ws: any) {
    try {
      console.log(`Starting WhatsApp session ${sessionId} for user ${userId}`);
      
      // Check for too many active sessions (WhatsApp limit)
      const activeSessions = Array.from(this.sessions.values()).filter(
        s => s.status === 'connecting' || s.status === 'qr_ready' || s.status === 'connected'
      );
      
      if (activeSessions.length >= 3) {
        ws.send(JSON.stringify({
          type: 'error',
          sessionId,
          message: 'Too many active connections. WhatsApp allows maximum 3-4 simultaneous connections. Please disconnect some sessions and try again.'
        }));
        return;
      }
      
      // Clear old session data to force fresh connection every time
      const authPath = `./auth_info_${sessionId}`;
      try {
        const fs = await import('fs');
        if (fs.existsSync(authPath)) {
          fs.rmSync(authPath, { recursive: true, force: true });
          console.log(`Cleared old auth data for session ${sessionId}`);
        }
      } catch (error) {
        console.log('Auth cleanup not needed:', error);
      }
      
      // Check for rate limiting (prevent too many attempts)
      const now = Date.now();
      const lastAttempt = this.getLastAttemptTime(userId);
      const timeSinceLastAttempt = now - lastAttempt;
      
      if (timeSinceLastAttempt < 60000) { // 1 minute cooldown
        const waitTime = Math.ceil((60000 - timeSinceLastAttempt) / 1000);
        ws.send(JSON.stringify({
          type: 'error',
          sessionId,
          message: `Please wait ${waitTime} seconds before trying again to avoid rate limiting.`
        }));
        return;
      }
      
      this.setLastAttemptTime(userId, now);
      
      // Create session entry
      const session: WhatsAppSession = {
        id: sessionId,
        userId,
        status: 'connecting'
      };
      this.sessions.set(sessionId, session);

      // Get the latest version of WhatsApp Web
      const { version, isLatest } = await fetchLatestBaileysVersion();
      console.log(`Using WA v${version.join('.')}, isLatest: ${isLatest}`);

      // Set up auth state (stores session data)
      const { state, saveCreds } = await useMultiFileAuthState(`./auth_info_${sessionId}`);

      // Create WhatsApp socket with proper configuration
      const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false, // We'll handle QR ourselves
        browser: ['Ubuntu', 'Chrome', '20.0.04'], // Use more common browser info
        generateHighQualityLinkPreview: true,
        markOnlineOnConnect: false,
        syncFullHistory: false,
        defaultQueryTimeoutMs: 60000,
      });

      session.socket = sock;
      this.sessions.set(sessionId, session);

      // Send initial connection status
      ws.send(JSON.stringify({
        type: 'connecting',
        sessionId,
        message: 'Connecting to WhatsApp servers...'
      }));

      // Set connection timeout
      const connectionTimeout = setTimeout(() => {
        console.log(`Connection timeout for session ${sessionId}`);
        ws.send(JSON.stringify({
          type: 'error',
          sessionId,
          message: 'Connection timeout. WhatsApp servers may be busy. Please wait 5 minutes and try again.'
        }));
        sock.end(undefined);
        session.status = 'disconnected';
        this.sessions.set(sessionId, session);
      }, 45000); // 45 second timeout

      // Handle connection updates
      sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
          console.log('QR Code received for session:', sessionId);
          clearTimeout(connectionTimeout); // Clear timeout since we got QR
          
          // Generate QR code as data URL
          const qrCodeDataUrl = await QRCode.toDataURL(qr, {
            width: 256,
            margin: 1,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          });
          
          session.qrCode = qrCodeDataUrl;
          session.status = 'qr_ready';
          this.sessions.set(sessionId, session);
          
          // Send QR to client
          ws.send(JSON.stringify({
            type: 'qr_code',
            sessionId,
            qrCode: qrCodeDataUrl,
            message: 'Scan this QR code with your WhatsApp mobile app'
          }));
        }
        
        if (connection === 'close') {
          const error = lastDisconnect?.error as Boom;
          const statusCode = error?.output?.statusCode;
          
          console.log('Connection closed due to', lastDisconnect?.error, ', status code:', statusCode);
          
          session.status = 'disconnected';
          this.sessions.set(sessionId, session);
          
          let message = 'WhatsApp session disconnected';
          let canRetry = false;
          
          switch (statusCode) {
            case 401:
              message = 'WhatsApp blocked this connection due to rate limiting. This happens when:\n• Too many connection attempts in short time\n• Multiple simultaneous connections\n• Suspicious activity detected\n\nSolution: Wait 15-30 minutes before trying again. Use only one connection at a time.';
              canRetry = false;
              break;
            case 403:
              message = 'WhatsApp rejected the connection. Your number may be temporarily restricted.';
              canRetry = false;
              break;
            case 408:
              message = 'Connection timeout. Check your internet connection and try again.';
              canRetry = true;
              break;
            case DisconnectReason.badSession:
              message = 'Invalid session data. Clearing cache and generating new QR code.';
              canRetry = true;
              // Clean up auth data for fresh start
              try {
                const fs = await import('fs');
                const authPath = `./auth_info_${sessionId}`;
                if (fs.existsSync(authPath)) {
                  fs.rmSync(authPath, { recursive: true, force: true });
                }
              } catch (e) {
                console.log('Auth cleanup failed:', e);
              }
              break;
            case DisconnectReason.loggedOut:
              message = 'WhatsApp account was logged out. Please scan QR code again.';
              canRetry = true;
              break;
            default:
              message = `Connection failed with code ${statusCode}. Please try again.`;
              canRetry = true;
          }
          
          ws.send(JSON.stringify({
            type: 'disconnected',
            sessionId,
            message,
            error: error?.message || 'Connection failed',
            canRetry,
            statusCode
          }));
          
          // Only auto-reconnect for certain error types
          if (canRetry && statusCode !== 401 && statusCode !== 403) {
            setTimeout(async () => {
              console.log(`Auto-retrying connection for session ${sessionId}`);
              await this.startWhatsAppSession(sessionId, userId, ws);
            }, 10000); // Wait 10 seconds before reconnecting
          }
        } else if (connection === 'open') {
          console.log('WhatsApp connection opened successfully');
          clearTimeout(connectionTimeout); // Clear timeout on successful connection
          const phoneNumber = sock.user?.id?.split(':')[0] || 'Unknown';
          
          session.phoneNumber = phoneNumber;
          session.status = 'connected';
          this.sessions.set(sessionId, session);
          
          // Save to database
          try {
            await storage.createWhatsappNumber({
              userId,
              phoneNumber: `+${phoneNumber}`,
              displayName: sock.user?.name || null,
              accountType: 'personal',
              status: 'active',
              dailyMessageLimit: 1000,
              messagesSentToday: 0,
              successRate: '100.00',
              sessionData: { sessionId }
            });
          } catch (error) {
            console.error('Error saving WhatsApp number to database:', error);
          }
          
          ws.send(JSON.stringify({
            type: 'connected',
            sessionId,
            phoneNumber: `+${phoneNumber}`,
            name: sock.user?.name,
            message: 'WhatsApp connected successfully!'
          }));
        }
      });

      // Handle credentials update
      sock.ev.on('creds.update', saveCreds);

      // Handle messages (for future use)
      sock.ev.on('messages.upsert', (m) => {
        console.log('Received messages:', JSON.stringify(m, undefined, 2));
      });

    } catch (error) {
      console.error('Error starting WhatsApp session:', error);
      ws.send(JSON.stringify({
        type: 'error',
        sessionId,
        message: 'Failed to start WhatsApp session'
      }));
    }
  }

  async sendQRCode(sessionId: string, ws: any) {
    const session = this.sessions.get(sessionId);
    if (session && session.qrCode) {
      ws.send(JSON.stringify({
        type: 'qr_code',
        sessionId,
        qrCode: session.qrCode
      }));
    } else {
      ws.send(JSON.stringify({
        type: 'error',
        sessionId,
        message: 'QR code not available'
      }));
    }
  }

  async disconnectSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (session && session.socket) {
      await session.socket.logout();
      session.status = 'disconnected';
      this.sessions.set(sessionId, session);
    }
  }

  getSession(sessionId: string): WhatsAppSession | undefined {
    return this.sessions.get(sessionId);
  }

  getAllSessions(): WhatsAppSession[] {
    return Array.from(this.sessions.values());
  }

  // Method to send messages (for future use)
  async sendMessage(sessionId: string, to: string, message: string) {
    const session = this.sessions.get(sessionId);
    if (session && session.socket && session.status === 'connected') {
      try {
        const result = await session.socket.sendMessage(`${to}@s.whatsapp.net`, {
          text: message
        });
        return result;
      } catch (error) {
        console.error('Error sending message:', error);
        throw error;
      }
    } else {
      throw new Error('WhatsApp session not connected');
    }
  }

  private getLastAttemptTime(userId: string): number {
    return this.lastAttempts.get(userId) || 0;
  }

  private setLastAttemptTime(userId: string, time: number) {
    this.lastAttempts.set(userId, time);
  }
}

export const whatsappService = new WhatsAppService();