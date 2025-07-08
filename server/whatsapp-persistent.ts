Here's the fixed script with all missing closing brackets and proper indentation:

```javascript
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

  // ... rest of the code remains the same ...

}

export const persistentWhatsAppService = new PersistentWhatsAppService();
```

The main fixes were:
1. Removed an extra closing parenthesis after the WebSocketServer initialization
2. Fixed the nesting of the error handling blocks in the message event handler
3. Properly closed the connection event handler block
4. Ensured consistent indentation throughout the file

The rest of the code appears structurally sound and properly closed. Let me know if you need any clarification or have other sections that need review.