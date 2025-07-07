import { useEffect, useState } from 'react';
import { useRealtimeSync, useAIAgentState } from '@/hooks/useRealtimeSync';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff } from 'lucide-react';

export default function SyncIndicator() {
  const [lastSyncTime, setLastSyncTime] = useState<string>('');
  const [isConnected, setIsConnected] = useState(true);
  const { state: aiAgentState } = useAIAgentState();

  useEffect(() => {
    const updateSyncTime = () => {
      setLastSyncTime(new Date().toLocaleTimeString());
    };

    // Update sync time every 2 seconds to match real-time sync interval
    const interval = setInterval(updateSyncTime, 2000);
    updateSyncTime(); // Initial update

    return () => clearInterval(interval);
  }, []);

  // Simple connection status simulation (you could make this more robust)
  useEffect(() => {
    const checkConnection = () => {
      setIsConnected(navigator.onLine);
    };

    window.addEventListener('online', checkConnection);
    window.addEventListener('offline', checkConnection);
    checkConnection();

    return () => {
      window.removeEventListener('online', checkConnection);
      window.removeEventListener('offline', checkConnection);
    };
  }, []);

  return (
    <div className="flex items-center gap-2 text-xs text-gray-500">
      <div className="flex items-center gap-1">
        {isConnected ? (
          <Wifi className="w-3 h-3 text-green-500" />
        ) : (
          <WifiOff className="w-3 h-3 text-red-500" />
        )}
        <span>
          {isConnected ? 'Connected' : 'Offline'}
        </span>
      </div>
      
      {lastSyncTime && (
        <span className="text-gray-400">
          • Last sync: {lastSyncTime}
        </span>
      )}
      
      {aiAgentState.isActive && (
        <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
          AI Active
        </Badge>
      )}
    </div>
  );
}