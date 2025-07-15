import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  Badge,
  Box,
  Center,
  Flex,
  Heading,
  Spinner,
  Text,
  VStack,
  HStack,
  Card,
  CardHeader,
  CardBody,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
} from '@chakra-ui/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../../hooks/useAuth';
import { apiClient, Reseller, UsagePoint, Alert as AlertType, LinkState } from '../../utils/api';

export default function ResellerDetail() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { id } = router.query;
  const [reseller, setReseller] = useState<Reseller | null>(null);
  const [usageData, setUsageData] = useState<UsagePoint[]>([]);
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [linkStates, setLinkStates] = useState<LinkState[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [apiAvailable, setApiAvailable] = useState(false);

  useEffect(() => {
    // Allow access without authentication for demo purposes
    // if (!loading && !user) {
    //   router.push('/');
    // }
  }, [loading, user, router]);

  useEffect(() => {
    if (id) {
      console.log('Reseller detail page loading for ID:', id);
      loadData(id as string);
    }
  }, [id]);

  const loadData = async (resellerId: string) => {
    try {
      console.log(`Loading data for reseller: ${resellerId}`);
      const [resellerData, usageData, alertsData, linkStatesData] = await Promise.all([
        apiClient.getReseller(resellerId),
        apiClient.getResellerUsage(resellerId, 24),
        apiClient.getResellerAlerts(resellerId, 10),
        apiClient.getLinkStates()
      ]);
      
      console.log('API data loaded successfully:', {
        reseller: resellerData,
        usage: usageData.length,
        alerts: alertsData.length,
        linkStates: linkStatesData.length
      });
      
      setReseller(resellerData);
      setUsageData(usageData);
      setAlerts(alertsData);
      setLinkStates(linkStatesData);
      setApiAvailable(true);
    } catch (error) {
      console.error('Failed to load reseller data:', error);
      console.log('API not available for reseller detail page');
      setApiAvailable(false);
      
      // Set empty data when API fails
      setReseller(null);
      setUsageData([]);
      setAlerts([]);
      setLinkStates([]);
    } finally {
      setDataLoading(false);
    }
  };

  const getCurrentLinkState = (resellerId: string): string => {
    const linkState = linkStates.find(ls => ls.reseller_id === resellerId);
    return linkState?.state || 'UNKNOWN';
  };

  console.log('Reseller detail render - loading:', loading, 'dataLoading:', dataLoading, 'reseller:', reseller?.name, 'id:', id);

  if (loading) {
    return (
      <Center h="100vh">
        <Spinner size="lg" />
        <Text ml={4}>Loading auth...</Text>
      </Center>
    );
  }

  if (dataLoading) {
    return (
      <Center h="100vh">
        <Spinner size="lg" />
        <Text ml={4}>Loading reseller data...</Text>
      </Center>
    );
  }

  if (!reseller) {
    return (
      <Center h="100vh">
        <Text>Reseller not found (ID: {id})</Text>
      </Center>
    );
  }

  // Transform usage data for chart
  const chartData = usageData.map(point => ({
    time: new Date(point.ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    rx: point.rx_mbps,
    tx: point.tx_mbps,
  }));

  // Get the current status for this reseller
  const currentStatus = getCurrentLinkState(id as string);
  const statusColor = currentStatus === 'UP' ? 'green' : currentStatus === 'IDLE' ? 'gray' : 'red';

  return (
    <Box p={8} maxW="7xl" mx="auto">
      {/* API Status Banner */}
      {!apiAvailable && (
        <Alert status="warning" mb={6} borderRadius="md">
          <AlertIcon />
          <Box flex="1">
            <AlertTitle fontSize="sm">API Unavailable</AlertTitle>
            <AlertDescription fontSize="sm">
              The API backend is not available. Please ensure the backend services are running.
            </AlertDescription>
          </Box>
        </Alert>
      )}

      <Flex mb={6} align="center" justify="space-between">
        <Heading>{reseller.name}</Heading>
        <HStack>
          <Badge colorScheme={apiAvailable ? 'green' : 'orange'} fontSize="sm">
            {apiAvailable ? 'Live Data' : 'API Unavailable'}
          </Badge>
          <Badge colorScheme={statusColor} fontSize="md" px={3} py={1}>
            {currentStatus}
          </Badge>
        </HStack>
      </Flex>

      <VStack spacing={8} align="stretch">
        {/* 24-Hour Usage Chart */}
        <Card>
          <CardHeader>
            <Heading size="md">24-Hour Bandwidth Usage</Heading>
            <Text fontSize="sm" color="gray.600">
              Plan: {reseller.plan_mbps} Mbps • Threshold: {reseller.threshold}%
            </Text>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis label={{ value: 'Mbps', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Line type="monotone" dataKey="rx" stroke="#3182ce" name="Download" strokeWidth={2} />
                <Line type="monotone" dataKey="tx" stroke="#38a169" name="Upload" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        {/* Alerts Timeline */}
        <Card>
          <CardHeader>
            <Heading size="md">Recent Alerts</Heading>
            <Text fontSize="sm" color="gray.600">
              Last 10 alerts for this reseller
            </Text>
          </CardHeader>
          <CardBody>
            <VStack spacing={4} align="stretch">
              {alerts.length > 0 ? (
                alerts.map((alert) => (
                  <HStack key={alert.id} p={4} bg="gray.50" borderRadius="md" justify="space-between">
                    <VStack align="start" spacing={1}>
                      <Text fontSize="sm" color="gray.600">
                        {new Date(alert.sent_at).toLocaleString()}
                      </Text>
                      <Text>{alert.message}</Text>
                    </VStack>
                    <Badge
                      colorScheme={
                        alert.level === 'RED' ? 'red' : 
                        alert.level === 'YELLOW' ? 'yellow' : 
                        alert.level === 'LINK_DOWN' ? 'red' : 'gray'
                      }
                    >
                      {alert.level}
                    </Badge>
                  </HStack>
                ))
              ) : (
                <Text color="gray.500">No recent alerts</Text>
              )}
            </VStack>
          </CardBody>
        </Card>
      </VStack>

      <Flex mt={8} justify="center" color="gray.500">
        <Text fontSize="sm">
          {apiAvailable 
            ? 'Real-time data from API – updates every 5 minutes.' 
            : 'API backend is not available. Please ensure services are running.'}
        </Text>
      </Flex>
    </Box>
  );
} 