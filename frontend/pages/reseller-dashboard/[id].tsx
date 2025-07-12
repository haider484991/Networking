import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  Center,
  Flex,
  Heading,
  HStack,
  Spinner,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Text,
  VStack,
  Badge,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  useToast,
  Divider,
  Grid,
  GridItem,
} from '@chakra-ui/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { apiClient, Reseller, UsagePoint, Alert as AlertType } from '../../utils/api';

export default function ResellerDashboard() {
  const router = useRouter();
  const { id } = router.query;
  const [reseller, setReseller] = useState<Reseller | null>(null);
  const [usage, setUsage] = useState<UsagePoint[]>([]);
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!id) return;

    // Check if reseller is authenticated
    const session = localStorage.getItem('reseller_session');
    if (!session) {
      router.push('/reseller-login');
      return;
    }

    try {
      const sessionData = JSON.parse(session);
      if (sessionData.id !== id) {
        toast({
          title: 'Access Denied',
          description: 'You can only access your own dashboard.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        router.push('/reseller-login');
        return;
      }
      setIsAuthenticated(true);
    } catch (error) {
      router.push('/reseller-login');
      return;
    }

    loadData();
  }, [id, router, toast]);

  const loadData = async () => {
    if (!id) return;

    setLoading(true);
    try {
      const [resellerData, usageData, alertsData] = await Promise.all([
        apiClient.getReseller(id as string),
        apiClient.getResellerUsage(id as string, 24),
        apiClient.getResellerAlerts(id as string, 10),
      ]);

      setReseller(resellerData);
      setUsage(usageData);
      setAlerts(alertsData);
    } catch (error) {
      toast({
        title: 'Error Loading Data',
        description: 'Failed to load dashboard data. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('reseller_session');
    router.push('/reseller-login');
  };

  const formatChartData = (data: UsagePoint[]) => {
    return data.map(point => ({
      time: new Date(point.ts).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      download: point.rx_mbps,
      upload: point.tx_mbps,
      total: point.rx_mbps + point.tx_mbps,
    }));
  };

  const getCurrentUtilization = () => {
    if (!usage.length || !reseller) return 0;
    const latest = usage[usage.length - 1];
    const currentUsage = latest.rx_mbps + latest.tx_mbps;
    return (currentUsage / reseller.plan_mbps) * 100;
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 100) return 'red';
    if (utilization >= 80) return 'yellow';
    return 'green';
  };

  const getRecentAlerts = () => {
    return alerts.slice(0, 5);
  };

  if (!isAuthenticated || loading) {
    return (
      <Center h="100vh">
        <VStack spacing={4}>
          <Spinner size="xl" />
          <Text>Loading your dashboard...</Text>
        </VStack>
      </Center>
    );
  }

  if (!reseller) {
    return (
      <Center h="100vh">
        <VStack spacing={4}>
          <Text>Reseller not found</Text>
          <Button onClick={() => router.push('/reseller-login')}>
            Back to Login
          </Button>
        </VStack>
      </Center>
    );
  }

  const chartData = formatChartData(usage);
  const currentUtilization = getCurrentUtilization();
  const utilizationColor = getUtilizationColor(currentUtilization);
  const recentAlerts = getRecentAlerts();

  return (
    <Box p={6} maxW="7xl" mx="auto">
      {/* Header */}
      <Flex justify="space-between" align="center" mb={6}>
        <VStack align="start" spacing={1}>
          <Heading size="lg">{reseller.name} Dashboard</Heading>
          <Text color="gray.600">Your bandwidth usage and alerts</Text>
        </VStack>
        <Button variant="outline" onClick={handleLogout}>
          Logout
        </Button>
      </Flex>

      {/* Stats Grid */}
      <Grid templateColumns="repeat(auto-fit, minmax(250px, 1fr))" gap={6} mb={6}>
        <GridItem>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Plan Allocation</StatLabel>
                <StatNumber>{reseller.plan_mbps} Mbps</StatNumber>
                <StatHelpText>Your bandwidth limit</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        </GridItem>

        <GridItem>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Current Usage</StatLabel>
                <StatNumber>
                  {usage.length > 0 
                    ? (usage[usage.length - 1].rx_mbps + usage[usage.length - 1].tx_mbps).toFixed(1)
                    : '0.0'} Mbps
                </StatNumber>
                <StatHelpText>
                  <Badge colorScheme={utilizationColor}>
                    {currentUtilization.toFixed(1)}% utilized
                  </Badge>
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        </GridItem>

        <GridItem>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Recent Alerts</StatLabel>
                <StatNumber>{alerts.length}</StatNumber>
                <StatHelpText>
                  {alerts.length > 0 
                    ? `Last: ${new Date(alerts[0].sent_at).toLocaleString()}`
                    : 'No recent alerts'
                  }
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        </GridItem>
      </Grid>

      {/* Usage Chart */}
      <Card mb={6}>
        <CardHeader>
          <Heading size="md">24-Hour Usage Chart</Heading>
        </CardHeader>
        <CardBody>
          {chartData.length > 0 ? (
            <Box h="400px">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      `${value.toFixed(1)} Mbps`,
                      name === 'download' ? 'Download' : name === 'upload' ? 'Upload' : 'Total'
                    ]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="download" 
                    stroke="#3182ce" 
                    strokeWidth={2}
                    name="download"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="upload" 
                    stroke="#e53e3e" 
                    strokeWidth={2}
                    name="upload"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="total" 
                    stroke="#38a169" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name="total"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          ) : (
            <Center h="400px">
              <VStack spacing={4}>
                <Text color="gray.500">No usage data available</Text>
                <Button onClick={loadData} size="sm">
                  Refresh Data
                </Button>
              </VStack>
            </Center>
          )}
        </CardBody>
      </Card>

      {/* Recent Alerts */}
      <Card>
        <CardHeader>
          <Heading size="md">Recent Alerts</Heading>
        </CardHeader>
        <CardBody>
          {recentAlerts.length > 0 ? (
            <VStack spacing={3} align="stretch">
              {recentAlerts.map((alert, index) => (
                <Alert 
                  key={index}
                  status={alert.level === 'RED' ? 'error' : alert.level === 'YELLOW' ? 'warning' : 'info'}
                  borderRadius="md"
                >
                  <AlertIcon />
                  <Box flex="1">
                    <AlertTitle fontSize="sm">
                      {alert.level} Alert
                    </AlertTitle>
                    <AlertDescription fontSize="sm">
                      {alert.message}
                    </AlertDescription>
                  </Box>
                  <Text fontSize="xs" color="gray.500">
                    {new Date(alert.sent_at).toLocaleString()}
                  </Text>
                </Alert>
              ))}
            </VStack>
          ) : (
            <Center p={8}>
              <VStack spacing={2}>
                <Text color="gray.500">No recent alerts</Text>
                <Text fontSize="sm" color="gray.400">
                  Your usage is within normal limits
                </Text>
              </VStack>
            </Center>
          )}
        </CardBody>
      </Card>

      {/* Footer */}
      <Center mt={8}>
        <VStack spacing={2}>
          <Text fontSize="sm" color="gray.500">
            Data refreshes every 5 minutes
          </Text>
          <HStack spacing={4}>
            <Button size="sm" onClick={loadData}>
              Refresh Now
            </Button>
            <Button size="sm" variant="outline" onClick={() => router.push('/reseller-login')}>
              Switch Account
            </Button>
          </HStack>
        </VStack>
      </Center>
    </Box>
  );
} 