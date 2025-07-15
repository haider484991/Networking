import React, { useState, useEffect } from 'react';
import { Box, Heading, Container, VStack, Text, Badge, Spinner } from '@chakra-ui/react';
import { Alert } from '../utils/api';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/alerts?limit=50`);
      if (response.ok) {
        const data = await response.json();
        setAlerts(data);
      }
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const getBadgeColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'critical': return 'red';
      case 'warning': return 'yellow';
      case 'info': return 'blue';
      default: return 'gray';
    }
  };

  return (
    <Box minH="100vh" bg="gray.50">
      <Container maxW="7xl" px={6} py={8}>
        <Heading as="h1" size="lg" mb={6}>System Alerts</Heading>
        {loading ? (
          <Spinner size="lg" />
        ) : (
          <VStack spacing={4} align="stretch">
            {alerts.length === 0 ? (
              <Text>No alerts found</Text>
            ) : (
              alerts.map(alert => (
                <Box key={alert.id} p={4} bg="white" borderRadius="md" shadow="sm">
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Badge colorScheme={getBadgeColor(alert.level)}>{alert.level}</Badge>
                    <Text fontSize="sm" color="gray.500">{new Date(alert.sent_at).toLocaleString()}</Text>
                  </Box>
                  <Text>{alert.message}</Text>
                  {alert.reseller_id && (
                    <Text fontSize="sm" color="gray.600" mt={1}>Reseller: {alert.reseller_id}</Text>
                  )}
                </Box>
              ))
            )}
          </VStack>
        )}
      </Container>
    </Box>
  );
} 