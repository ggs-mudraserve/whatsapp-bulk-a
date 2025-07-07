import { useEffect, useRef, useState } from 'react';
import { queryClient } from '@/lib/queryClient';

// Real-time sync hook for inbox and AI agents synchronization
export function useRealtimeSync() {
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncRef = useRef<number>(Date.now());

  useEffect(() => {
    // Function to invalidate and refetch all relevant queries
    const syncData = async () => {
      try {
        // Only sync if it's been more than 1 second since last sync to avoid spam
        const now = Date.now();
        if (now - lastSyncRef.current < 1000) return;
        lastSyncRef.current = now;

        // Invalidate conversations to refresh inbox
        await queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
        
        // Invalidate messages for active conversations
        const activeConversationQueries = queryClient.getQueryCache()
          .findAll({ queryKey: ['/api/messages'] });
        
        for (const query of activeConversationQueries) {
          await queryClient.invalidateQueries({ queryKey: query.queryKey });
        }
        
        // Invalidate AI agent settings
        await queryClient.invalidateQueries({ queryKey: ['/api/chatbot/settings'] });
        
        // Invalidate WhatsApp sessions
        await queryClient.invalidateQueries({ queryKey: ['/api/whatsapp/active-sessions'] });
        
        console.log('🔄 Real-time sync completed');
      } catch (error) {
        console.error('Real-time sync error:', error);
      }
    };

    // Start real-time sync every 2 seconds
    syncIntervalRef.current = setInterval(syncData, 2000);

    // Cleanup on unmount
    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, []);

  // Manual sync function for immediate updates
  const triggerSync = async () => {
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
    }
    
    // Immediate sync
    await queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
    await queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
    await queryClient.invalidateQueries({ queryKey: ['/api/chatbot/settings'] });
    
    // Restart interval
    syncIntervalRef.current = setInterval(async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/chatbot/settings'] });
    }, 2000);
  };

  return { triggerSync };
}

// AI Agent state management for cross-page synchronization
export interface AIAgentState {
  isActive: boolean;
  selectedAgent: string;
  conversationId: number | null;
  lastActivated: number;
}

class AIAgentManager {
  private static instance: AIAgentManager;
  private state: AIAgentState = {
    isActive: false,
    selectedAgent: '',
    conversationId: null,
    lastActivated: 0
  };
  private listeners: ((state: AIAgentState) => void)[] = [];

  static getInstance(): AIAgentManager {
    if (!AIAgentManager.instance) {
      AIAgentManager.instance = new AIAgentManager();
    }
    return AIAgentManager.instance;
  }

  getState(): AIAgentState {
    return { ...this.state };
  }

  setState(newState: Partial<AIAgentState>) {
    this.state = { ...this.state, ...newState, lastActivated: Date.now() };
    this.notifyListeners();
    
    // Store in localStorage for persistence across page refreshes
    localStorage.setItem('ai_agent_state', JSON.stringify(this.state));
  }

  subscribe(listener: (state: AIAgentState) => void) {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.state));
  }

  // Load state from localStorage on initialization
  loadPersistedState() {
    try {
      const stored = localStorage.getItem('ai_agent_state');
      if (stored) {
        this.state = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load AI agent state:', error);
    }
  }

  // Activate AI agent for a conversation
  async activateAgent(conversationId: number, agentType: string) {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/ai-agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          active: true, 
          agentType 
        }),
      });
      
      if (!response.ok) throw new Error('Failed to activate AI agent');
      
      this.setState({
        isActive: true,
        selectedAgent: agentType,
        conversationId
      });
      
      return true;
    } catch (error) {
      console.error('Failed to activate AI agent:', error);
      return false;
    }
  }

  // Deactivate AI agent
  async deactivateAgent(conversationId: number) {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/ai-agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          active: false, 
          agentType: null 
        }),
      });
      
      if (!response.ok) throw new Error('Failed to deactivate AI agent');
      
      this.setState({
        isActive: false,
        selectedAgent: '',
        conversationId: null
      });
      
      return true;
    } catch (error) {
      console.error('Failed to deactivate AI agent:', error);
      return false;
    }
  }
}

export const aiAgentManager = AIAgentManager.getInstance();

// Hook for using AI agent state in components
export function useAIAgentState() {
  const [state, setState] = useState<AIAgentState>(aiAgentManager.getState());

  useEffect(() => {
    // Load persisted state on mount
    aiAgentManager.loadPersistedState();
    setState(aiAgentManager.getState());

    // Subscribe to state changes
    const unsubscribe = aiAgentManager.subscribe(setState);
    return unsubscribe;
  }, []);

  return {
    state,
    activateAgent: aiAgentManager.activateAgent.bind(aiAgentManager),
    deactivateAgent: aiAgentManager.deactivateAgent.bind(aiAgentManager)
  };
}