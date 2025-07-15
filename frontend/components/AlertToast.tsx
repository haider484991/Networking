import React, { useEffect, useState } from 'react';
import { useToast } from '@chakra-ui/react';

interface Alert {
  id: string;
  level: string;
  message: string;
  timestamp?: string;
  sent_at?: string;
}

export function AlertToast() {
  const toast = useToast();
  const [lastAlertCheck, setLastAlertCheck] = useState<Date>(new Date());

  useEffect(() => {
    // Check for new alerts every 30 seconds from API
    const checkForNewAlerts = async () => {
      try {
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const response = await fetch(`${API_BASE}/alerts?limit=5`);
        
        if (response.ok) {
          const alerts: Alert[] = await response.json();
          
          // Filter alerts that are newer than our last check
          const newAlerts = alerts.filter(alert => 
            new Date(alert.timestamp || alert.sent_at) > lastAlertCheck
          );
          
          // Show toast for each new alert
          newAlerts.forEach(alert => {
            const statusType = alert.level === 'RED' ? 'error' : 
                             alert.level === 'YELLOW' ? 'warning' : 
                             alert.level === 'LINK_DOWN' ? 'error' : 'info';
        
        toast({
          title: `${alert.level} Alert`,
          description: alert.message,
              status: statusType,
          duration: 5000,
          isClosable: true,
          position: 'top-right',
        });
          });
          
          if (newAlerts.length > 0) {
            setLastAlertCheck(new Date());
          }
        }
      } catch (error) {
        console.error('Failed to fetch alerts for toast notifications:', error);
        // Silently fail - don't show alerts if API is not available
      }
    };

    // Initial check after 5 seconds, then every 30 seconds
    const timeout = setTimeout(checkForNewAlerts, 5000);
    const interval = setInterval(checkForNewAlerts, 30000);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [lastAlertCheck, toast]);

  return null; // This component doesn't render anything visible
} 