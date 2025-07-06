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

  async initializeWebSocket(httpServer: Server) {
    this.wss = new WebSocketServer({ 
      server: httpServer, 
      path: '/ws/whatsapp' 
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
      case 'start_session':
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

      // Create WhatsApp socket
      const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false, // We'll handle QR ourselves
        browser: ['WhatsApp Marketing', 'Desktop', '1.0.0'],
        generateHighQualityLinkPreview: true,
      });

      session.socket = sock;
      this.sessions.set(sessionId, session);

      // Handle connection updates
      sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
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
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut && statusCode !== 401;
          
          console.log('Connection closed due to', lastDisconnect?.error, ', status code:', statusCode, ', reconnecting:', shouldReconnect);
          
          session.status = 'disconnected';
          this.sessions.set(sessionId, session);
          
          let message = 'WhatsApp session disconnected';
          if (statusCode === 401) {
            message = 'WhatsApp rejected the connection. Please wait a few minutes before trying again, or try connecting fewer sessions simultaneously.';
          }
          
          ws.send(JSON.stringify({
            type: 'disconnected',
            sessionId,
            message,
            error: error?.message || 'Connection failed'
          }));
          
          // Don't auto-reconnect for 401 errors (rate limiting)
          if (shouldReconnect) {
            setTimeout(async () => {
              await this.startWhatsAppSession(sessionId, userId, ws);
            }, 5000); // Wait 5 seconds before reconnecting
          }
        } else if (connection === 'open') {
          console.log('WhatsApp connection opened successfully');
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
}

export const whatsappService = new WhatsAppService();