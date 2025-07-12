import { useEffect, useState } from 'react';
import { useToast } from '@chakra-ui/react';

interface Alert {
  id: string;
  level: 'YELLOW' | 'RED' | 'LINK_DOWN';
  message: string;
  timestamp: string;
}

// Mock alert stream - in real app this would come from Supabase Realtime
const mockAlertStream: Alert[] = [
  {
    id: 'alert1',
    level: 'YELLOW',
    message: 'SpeedServe bandwidth usage at 85%',
    timestamp: new Date().toISOString(),
  },
  {
    id: 'alert2',
    level: 'RED',
    message: 'OptiLine bandwidth exceeded 100%',
    timestamp: new Date(Date.now() + 30000).toISOString(),
  },
  {
    id: 'alert3',
    level: 'LINK_DOWN',
    message: 'DownTownNet link down - 3 ping failures',
    timestamp: new Date(Date.now() + 60000).toISOString(),
  },
];

export function AlertToast() {
  const toast = useToast();
  const [alertIndex, setAlertIndex] = useState(0);

  useEffect(() => {
    // Simulate alerts coming in every 30 seconds
    const interval = setInterval(() => {
      if (alertIndex < mockAlertStream.length) {
        const alert = mockAlertStream[alertIndex];
        
        toast({
          title: `${alert.level} Alert`,
          description: alert.message,
          status: alert.level === 'RED' ? 'error' : alert.level === 'YELLOW' ? 'warning' : 'info',
          duration: 5000,
          isClosable: true,
          position: 'top-right',
        });
        
        setAlertIndex(prev => prev + 1);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [alertIndex, toast]);

  return null; // This component doesn't render anything visible
} 