import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  Container,
  Flex,
  Grid,
  GridItem,
  Heading,
  HStack,
  VStack,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Text,
  Badge,
  Select,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Spinner,
  Center,
  Alert,
  AlertIcon,
  useColorModeValue,
  Icon,
  Divider,
} from '@chakra-ui/react';
import { RepeatIcon, SearchIcon } from '@chakra-ui/icons';

interface NetworkDevice {
  type: 'queue' | 'dhcp_lease' | 'interface';
  name: string;
  router_id: string;
  router_name: string;
  router_host: string;
  // Queue specific fields
  target?: string;
  max_limit?: string;
  burst_limit?: string;
  disabled?: boolean;
  bytes?: string;
  packets?: string;
  // DHCP lease specific fields
  ip_address?: string;
  mac_address?: string;
  server?: string;
  expires_after?: string;
  last_seen?: string;
  // Interface specific fields
  type_detail?: string;
  running?: boolean;
  rx_bytes?: string;
  tx_bytes?: string;
  id: string;
}

interface RouterStatus {
  router_id: string;
  name: string;
  host: string;
  status: 'online' | 'offline';
  device_count: number;
  error?: string;
}

interface NetworkSummary {
  total_routers: number;
  online_routers: number;
  total_devices: number;
}

interface DeviceMonitoringProps {
  onAlert: (message: string, type: 'success' | 'error') => void;
}

const DeviceMonitoring: React.FC<DeviceMonitoringProps> = ({ onAlert }) => {
  const [devices, setDevices] = useState<NetworkDevice[]>([]);
  const [routerStatuses, setRouterStatuses] = useState<RouterStatus[]>([]);
  const [summary, setSummary] = useState<NetworkSummary>({ total_routers: 0, online_routers: 0, total_devices: 0 });
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [selectedRouter, setSelectedRouter] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);

  // Color mode values for glass morphism
  const glassBg = useColorModeValue('rgba(255, 255, 255, 0.75)', 'rgba(26, 32, 44, 0.75)');
  const bgGradient = useColorModeValue('linear(to-r, blue.600, purple.600)', 'linear(to-r, blue.800, purple.800)');

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    fetchNetworkDevices();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchNetworkDevices, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNetworkDevices = async () => {
    setRefreshing(true);
    try {
      const response = await fetch(`${API_BASE}/api/network-devices`);
      const data = await response.json();
      
      setDevices(data.devices || []);
      setRouterStatuses(data.router_statuses || []);
      setSummary(data.summary || { total_routers: 0, online_routers: 0, total_devices: 0 });
    } catch (error) {
      console.error('Error fetching network devices:', error);
      onAlert('Failed to fetch network devices', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getFilteredDevices = () => {
    let filtered = devices;

    // Filter by device type
    if (activeFilter !== 'all') {
      filtered = filtered.filter(device => device.type === activeFilter);
    }

    // Filter by router
    if (selectedRouter !== 'all') {
      filtered = filtered.filter(device => device.router_id === selectedRouter);
    }

    return filtered;
  };

  const getDeviceTypeIcon = (type: string) => {
    switch (type) {
      case 'queue':
        return '🚦';
      case 'dhcp_lease':
        return '📱';
      case 'interface':
        return '🔌';
      default:
        return '❓';
    }
  };

  const getDeviceTypeLabel = (type: string) => {
    switch (type) {
      case 'queue':
        return 'Bandwidth Queue';
      case 'dhcp_lease':
        return 'DHCP Device';
      case 'interface':
        return 'Network Interface';
      default:
        return 'Unknown';
    }
  };

  const formatBytes = (bytes: string) => {
    if (!bytes || bytes === '0/0') return 'No data';
    
    const parts = bytes.split('/');
    if (parts.length !== 2) return bytes;
    
    const formatSize = (size: string) => {
      const num = parseInt(size);
      if (num < 1024) return `${num} B`;
      if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
      if (num < 1024 * 1024 * 1024) return `${(num / (1024 * 1024)).toFixed(1)} MB`;
      return `${(num / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    };
    
    return `↓${formatSize(parts[0])} ↑${formatSize(parts[1])}`;
  };

  if (loading) {
    return (
      <Box minH="100vh" bg="gray.50">
        {/* Header */}
        <Box bgGradient={bgGradient} color="white" shadow="lg">
          <Container maxW="7xl" px={6} py={4}>
            <Heading as="h1" size="lg" fontWeight="bold">
              Network Devices
            </Heading>
            <Text>Monitor and manage all network devices across your infrastructure</Text>
          </Container>
        </Box>

        <Container maxW="7xl" px={6} py={8}>
          <Center py={20}>
            <VStack spacing={4}>
              <Spinner size="xl" color="blue.500" thickness="4px" />
              <Text color="gray.500" fontSize="lg">Discovering network devices...</Text>
              <Text color="gray.400" fontSize="sm">Scanning routers and connected devices</Text>
            </VStack>
          </Center>
        </Container>
      </Box>
    );
  }

  const filteredDevices = getFilteredDevices();

  return (
    <Box minH="100vh" bg="gray.50">
      {/* Header */}
      <Box bgGradient={bgGradient} color="white" shadow="lg">
        <Container maxW="7xl" px={6} py={4}>
          <Flex justify="space-between" align="center">
            <Box>
              <Heading as="h1" size="lg" fontWeight="bold">
                Network Devices
              </Heading>
              <Text>Monitor and manage all network devices across your infrastructure</Text>
              <HStack spacing={4} mt={2}>
                <Badge colorScheme="green" variant="solid">REAL-TIME MONITORING</Badge>
                <Badge colorScheme="blue" variant="solid">AUTO-DISCOVERY</Badge>
                <Badge colorScheme="purple" variant="solid">MULTI-ROUTER SUPPORT</Badge>
              </HStack>
            </Box>
            <Button
              leftIcon={refreshing ? <Spinner size="sm" /> : <RepeatIcon />}
              onClick={fetchNetworkDevices}
              isLoading={refreshing}
              colorScheme="whiteAlpha"
              variant="solid"
              size="lg"
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </Flex>
        </Container>
      </Box>

      <Container maxW="7xl" px={6} py={8}>
        <VStack spacing={8} align="stretch">
          {/* Summary Cards */}
          <Grid templateColumns={{ base: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }} gap={6}>
            <Card bg={glassBg} backdropFilter="blur(10px)" borderRadius="xl" shadow="lg">
              <CardBody p={6}>
                <Stat>
                  <HStack>
                    <Text fontSize="3xl">🌐</Text>
                    <Box>
                      <StatLabel color="gray.500" fontSize="sm">Total Routers</StatLabel>
                      <StatNumber color="blue.600" fontSize="3xl" fontWeight="bold">
                        {summary.total_routers}
                      </StatNumber>
                    </Box>
                  </HStack>
                </Stat>
              </CardBody>
            </Card>

            <Card bg={glassBg} backdropFilter="blur(10px)" borderRadius="xl" shadow="lg">
              <CardBody p={6}>
                <Stat>
                  <HStack>
                    <Text fontSize="3xl">✅</Text>
                    <Box>
                      <StatLabel color="gray.500" fontSize="sm">Online Routers</StatLabel>
                      <StatNumber color="green.600" fontSize="3xl" fontWeight="bold">
                        {summary.online_routers}
                      </StatNumber>
                    </Box>
                  </HStack>
                </Stat>
              </CardBody>
            </Card>

            <Card bg={glassBg} backdropFilter="blur(10px)" borderRadius="xl" shadow="lg">
              <CardBody p={6}>
                <Stat>
                  <HStack>
                    <Text fontSize="3xl">❌</Text>
                    <Box>
                      <StatLabel color="gray.500" fontSize="sm">Offline Routers</StatLabel>
                      <StatNumber color="red.600" fontSize="3xl" fontWeight="bold">
                        {summary.total_routers - summary.online_routers}
                      </StatNumber>
                    </Box>
                  </HStack>
                </Stat>
              </CardBody>
            </Card>

            <Card bg={glassBg} backdropFilter="blur(10px)" borderRadius="xl" shadow="lg">
              <CardBody p={6}>
                <Stat>
                  <HStack>
                    <Text fontSize="3xl">📱</Text>
                    <Box>
                      <StatLabel color="gray.500" fontSize="sm">Total Devices</StatLabel>
                      <StatNumber color="blue.600" fontSize="3xl" fontWeight="bold">
                        {summary.total_devices}
                      </StatNumber>
                    </Box>
                  </HStack>
                </Stat>
              </CardBody>
            </Card>
          </Grid>

          {/* Router Status */}
          <Card bg={glassBg} backdropFilter="blur(10px)" borderRadius="xl" shadow="lg">
            <CardHeader>
              <Heading size="md">Router Status</Heading>
            </CardHeader>
            <CardBody>
              <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }} gap={4}>
                {routerStatuses.map((router) => (
                  <Card
                    key={router.router_id}
                    border="1px solid"
                    borderColor={router.status === 'online' ? 'green.200' : 'red.200'}
                    bg={router.status === 'online' ? 'green.50' : 'red.50'}
                    borderRadius="lg"
                  >
                    <CardBody>
                      <Flex justify="space-between" align="center">
                        <Box>
                          <Text fontWeight="bold">{router.name}</Text>
                          <Text fontSize="sm" color="gray.600">{router.host}</Text>
                          <Text fontSize="sm" color="gray.600">{router.device_count} devices</Text>
                        </Box>
                        <Badge
                          colorScheme={router.status === 'online' ? 'green' : 'red'}
                          variant="solid"
                          borderRadius="full"
                        >
                          {router.status}
                        </Badge>
                      </Flex>
                      {router.error && (
                        <Alert status="error" mt={2} borderRadius="md" size="sm">
                          <AlertIcon boxSize="12px" />
                          <Text fontSize="xs">{router.error}</Text>
                        </Alert>
                      )}
                    </CardBody>
                  </Card>
                ))}
              </Grid>
            </CardBody>
          </Card>

          {/* Filters */}
          <Card bg={glassBg} backdropFilter="blur(10px)" borderRadius="xl" shadow="lg">
            <CardHeader>
              <HStack>
                <Icon as={SearchIcon} />
                <Heading size="md">Device Filters</Heading>
              </HStack>
            </CardHeader>
            <CardBody>
              <HStack spacing={4} flexWrap="wrap">
                <Box>
                  <Text fontWeight="medium" mb={2}>Device Type</Text>
                  <Select
                    value={activeFilter}
                    onChange={(e) => setActiveFilter(e.target.value)}
                    bg="white"
                    borderRadius="md"
                    w="200px"
                  >
                    <option value="all">All Types</option>
                    <option value="queue">Bandwidth Queues</option>
                    <option value="dhcp_lease">DHCP Devices</option>
                    <option value="interface">Interfaces</option>
                  </Select>
                </Box>

                <Box>
                  <Text fontWeight="medium" mb={2}>Router</Text>
                  <Select
                    value={selectedRouter}
                    onChange={(e) => setSelectedRouter(e.target.value)}
                    bg="white"
                    borderRadius="md"
                    w="250px"
                  >
                    <option value="all">All Routers</option>
                    {routerStatuses.map((router) => (
                      <option key={router.router_id} value={router.router_id}>
                        {router.name} ({router.host})
                      </option>
                    ))}
                  </Select>
                </Box>

                <Box display="flex" alignItems="end">
                  <Button
                    onClick={() => {
                      setActiveFilter('all');
                      setSelectedRouter('all');
                    }}
                    variant="outline"
                    colorScheme="gray"
                  >
                    Clear Filters
                  </Button>
                </Box>
              </HStack>
            </CardBody>
          </Card>

          {/* Devices Table */}
          <Card bg={glassBg} backdropFilter="blur(10px)" borderRadius="xl" shadow="lg">
            <CardHeader>
              <Flex justify="space-between" align="center">
                <Heading size="md">Network Devices ({filteredDevices.length})</Heading>
                <Badge colorScheme="blue" variant="subtle" p={2} borderRadius="md">
                  {filteredDevices.length} devices found
                </Badge>
              </Flex>
            </CardHeader>
            <CardBody>
              {filteredDevices.length === 0 ? (
                <Center py={8}>
                  <VStack spacing={4}>
                    <Text fontSize="6xl">🔍</Text>
                    <Text color="gray.500" fontSize="lg">
                      {devices.length === 0 
                        ? 'No devices discovered. Check router connections.'
                        : 'No devices match the current filters.'
                      }
                    </Text>
                    <Button onClick={fetchNetworkDevices} colorScheme="blue" variant="outline">
                      Refresh Discovery
                    </Button>
                  </VStack>
                </Center>
              ) : (
                <Table variant="simple" size="sm">
                  <Thead>
                    <Tr>
                      <Th>Device</Th>
                      <Th>Router</Th>
                      <Th>Details</Th>
                      <Th>Status</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {filteredDevices.map((device, index) => (
                      <Tr key={`${device.router_id}-${device.id}-${index}`} _hover={{ bg: 'gray.50' }}>
                        <Td>
                          <HStack>
                            <Text fontSize="2xl">{getDeviceTypeIcon(device.type)}</Text>
                            <Box>
                              <Text fontWeight="bold" fontSize="sm">{device.name}</Text>
                              <Text fontSize="xs" color="gray.500">{getDeviceTypeLabel(device.type)}</Text>
                            </Box>
                          </HStack>
                        </Td>
                        <Td>
                          <Box>
                            <Text fontSize="sm" fontWeight="medium">{device.router_name}</Text>
                            <Text fontSize="xs" color="gray.500">{device.router_host}</Text>
                          </Box>
                        </Td>
                        <Td>
                          <VStack spacing={1} align="start">
                            {device.type === 'queue' && (
                              <>
                                <Text fontSize="xs"><strong>Target:</strong> {device.target}</Text>
                                <Text fontSize="xs"><strong>Limit:</strong> {device.max_limit}</Text>
                                <Text fontSize="xs"><strong>Traffic:</strong> {formatBytes(device.bytes || '0/0')}</Text>
                              </>
                            )}
                            {device.type === 'dhcp_lease' && (
                              <>
                                <Text fontSize="xs"><strong>IP:</strong> {device.ip_address}</Text>
                                <Text fontSize="xs"><strong>MAC:</strong> {device.mac_address}</Text>
                                <Text fontSize="xs"><strong>Last Seen:</strong> {device.last_seen}</Text>
                              </>
                            )}
                            {device.type === 'interface' && (
                              <>
                                <Text fontSize="xs"><strong>Type:</strong> {device.type_detail}</Text>
                                <Text fontSize="xs"><strong>RX:</strong> {device.rx_bytes}</Text>
                                <Text fontSize="xs"><strong>TX:</strong> {device.tx_bytes}</Text>
                              </>
                            )}
                          </VStack>
                        </Td>
                        <Td>
                          {device.type === 'queue' && (
                            <Badge
                              colorScheme={device.disabled ? 'red' : 'green'}
                              variant="solid"
                              borderRadius="full"
                            >
                              {device.disabled ? 'Disabled' : 'Active'}
                            </Badge>
                          )}
                          {device.type === 'interface' && (
                            <Badge
                              colorScheme={device.running ? 'green' : 'red'}
                              variant="solid"
                              borderRadius="full"
                            >
                              {device.running ? 'Running' : 'Down'}
                            </Badge>
                          )}
                          {device.type === 'dhcp_lease' && (
                            <Badge colorScheme="blue" variant="solid" borderRadius="full">
                              Active
                            </Badge>
                          )}
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              )}
            </CardBody>
          </Card>
        </VStack>
      </Container>
    </Box>
  );
};

export default DeviceMonitoring; 