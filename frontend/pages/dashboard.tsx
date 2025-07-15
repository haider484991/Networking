import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import {
  Box,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  VStack,
  HStack,
  Center,
  Spinner,
  Text,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Code,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  AlertDialog,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
  Button,
  useDisclosure,
  useToast,
  Grid,
  GridItem,
  Card,
  CardBody,
  CardHeader,
  Flex,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Container,
  useColorModeValue,
} from '@chakra-ui/react';
import { apiClient, Reseller, LinkState } from '../utils/api';
import ResellerManagement, { ResellerActionButtons } from '../components/ResellerManagement';
import ResellerLeaderboard from '../components/ResellerLeaderboard';
import BandwidthChart from '../components/BandwidthChart';
import NTTNChart from '../components/NTTNChart';
import NTTNManagement from '../components/NTTNManagement';
import { AlertToast } from '../components/AlertToast';

export default function Dashboard() {
  const router = useRouter();
  const [resellers, setResellers] = useState<Reseller[]>([]);
  const [linkStates, setLinkStates] = useState<LinkState[]>([]);
  const [currentUsage, setCurrentUsage] = useState<{ [key: string]: number }>({});
  const [dataLoading, setDataLoading] = useState(true);
  const [apiAvailable, setApiAvailable] = useState(true);
  const [supabaseConfigured, setSupabaseConfigured] = useState(true);

  // State for managing reseller edit/delete operations
  const [managingReseller, setManagingReseller] = useState<Reseller | null>(null);
  const [showManagement, setShowManagement] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  
  // State for delete dialog
  const [deletingReseller, setDeletingReseller] = useState<Reseller | null>(null);
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const [isDeleting, setIsDeleting] = useState(false);
  const toast = useToast();
  const cancelRef = React.useRef<HTMLButtonElement>(null);

  // Color mode values
  const bgGradient = useColorModeValue('linear(to-r, blue.600, purple.600)', 'linear(to-r, blue.800, purple.800)');
  const cardBg = useColorModeValue('rgba(255, 255, 255, 0.8)', 'rgba(26, 32, 44, 0.8)');
  const glassBg = useColorModeValue('rgba(255, 255, 255, 0.75)', 'rgba(26, 32, 44, 0.75)');

  // Check if Supabase is configured
  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    setSupabaseConfigured(!!(supabaseUrl && supabaseKey));
  }, []);

  const loadData = async () => {
    setDataLoading(true);
    try {
      // Try to fetch data from API
      const [resellersData, linkStatesData] = await Promise.all([
        apiClient.getResellers(),
        apiClient.getLinkStates(),
      ]);

      setResellers(resellersData);
      setLinkStates(linkStatesData);
      setApiAvailable(true);

      // Fetch current usage for each reseller
      const usagePromises = resellersData.map(async (reseller) => {
        try {
          const usage = await apiClient.getResellerUsage(reseller.id, 1);
          const latestUsage = usage.length > 0 ? usage[usage.length - 1] : null;
          return {
            id: reseller.id,
            usage: latestUsage ? latestUsage.rx_mbps + latestUsage.tx_mbps : 0,
          };
        } catch {
          return { id: reseller.id, usage: 0 };
        }
      });

      const usageResults = await Promise.all(usagePromises);
      const usageMap = usageResults.reduce((acc, { id, usage }) => {
        acc[id] = usage;
        return acc;
      }, {} as { [key: string]: number });

      setCurrentUsage(usageMap);
    } catch (error) {
      console.error('Failed to load data from API:', error);
      setApiAvailable(false);
      
      // Use mock data when API is not available
      const mockResellers: Reseller[] = [
        { id: 'r1', name: 'Downtown Office', plan_mbps: 500, threshold: 0.8, phone: '+8801000000001' },
        { id: 'r2', name: 'Warehouse', plan_mbps: 100, threshold: 0.8, phone: '+8801000000002' },
        { id: 'r3', name: 'Branch Office', plan_mbps: 50, threshold: 0.8, phone: '+8801000000003' },
        { id: 'r4', name: 'Remote Site', plan_mbps: 200, threshold: 0.8, phone: '+8801000000004' },
      ];
      
      const mockLinkStates: LinkState[] = [
        { reseller_id: 'r1', state: 'UP', since: new Date().toISOString() },
        { reseller_id: 'r2', state: 'UP', since: new Date().toISOString() },
        { reseller_id: 'r3', state: 'UP', since: new Date().toISOString() },
        { reseller_id: 'r4', state: 'DOWN', since: new Date(Date.now() - 300000).toISOString() },
      ];
      
      const mockUsage = {
        r1: 420, // 84% of 500
        r2: 75,  // 75% of 100
        r3: 30,  // 60% of 50
        r4: 0,   // 0% (down)
      };
      
      setResellers(mockResellers);
      setLinkStates(mockLinkStates);
      setCurrentUsage(mockUsage);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    
    // Refresh data every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Calculate summary statistics
  const totalBandwidth = resellers.reduce((sum, reseller) => sum + (currentUsage[reseller.id] || 0), 0);
  const activeVLANs = resellers.length;
  const alertCount = resellers.filter(reseller => {
    const usage = currentUsage[reseller.id] || 0;
    const utilization = (usage / reseller.plan_mbps) * 100;
    return utilization >= 80;
  }).length;
  const linksDown = linkStates.filter(link => link.state === 'DOWN').length;

  const getUtilizationBadge = (reseller: Reseller) => {
    const usage = currentUsage[reseller.id] || 0;
    const utilization = (usage / reseller.plan_mbps) * 100;
    
    let colorScheme = 'green';
    if (utilization >= 100) colorScheme = 'red';
    else if (utilization >= 80) colorScheme = 'yellow';
    
    return (
      <Badge colorScheme={colorScheme}>
        {utilization.toFixed(1)}%
      </Badge>
    );
  };

  const getLinkStatusBadge = (resellerId: string) => {
    const linkState = linkStates.find(ls => ls.reseller_id === resellerId);
    const status = linkState?.state || 'UNKNOWN';
    
    let colorScheme = 'gray';
    if (status === 'UP') colorScheme = 'green';
    else if (status === 'DOWN') colorScheme = 'red';
    else if (status === 'IDLE') colorScheme = 'yellow';
    
    return <Badge colorScheme={colorScheme}>{status}</Badge>;
  };

  const handleResellerClick = (resellerId: string) => {
    router.push(`/reseller/${resellerId}`);
  };

  const handleResellerChange = () => {
    loadData(); // Refresh data when resellers are modified
  };

  // Handle edit button click from dashboard table
  const handleEditReseller = (reseller: Reseller) => {
    setManagingReseller(reseller);
    setShowManagement(true);
    setActiveTab(1); // Switch to management tab
  };

  // Handle delete button click from dashboard table
  const handleDeleteReseller = (reseller: Reseller) => {
    setDeletingReseller(reseller);
    onDeleteOpen();
  };

  if (dataLoading) {
    return (
      <Center h="100vh" bgGradient={bgGradient}>
        <VStack spacing={4}>
          <Spinner size="xl" color="white" />
          <Text color="white" fontSize="lg">Loading dashboard...</Text>
        </VStack>
      </Center>
    );
  }

  return (
    <Box minH="100vh" bg="gray.50">
      {/* Header */}
      <Box bgGradient={bgGradient} color="white" shadow="lg">
        <Container maxW="7xl" px={6} py={4}>
          <Flex justify="space-between" align="center">
            <Heading as="h1" size="lg" fontWeight="bold">
              ISP Bandwidth Tracker
            </Heading>
            <HStack spacing={6} fontSize="sm">
              <Link href="/dashboard">
                <Text cursor="pointer" _hover={{ color: 'yellow.300' }}>Dashboard</Text>
              </Link>
              <Text cursor="pointer" _hover={{ color: 'yellow.300' }}>Devices</Text>
              <Text cursor="pointer" _hover={{ color: 'yellow.300' }}>Resellers</Text>
              <Text cursor="pointer" _hover={{ color: 'yellow.300' }}>Alerts</Text>
              <Link href="/settings">
                <Text cursor="pointer" _hover={{ color: 'yellow.300' }}>Settings</Text>
              </Link>
            </HStack>
          </Flex>
        </Container>
      </Box>

      <Container maxW="7xl" px={6} py={8}>
        {/* Configuration Status */}
        {!supabaseConfigured && (
          <Alert status="warning" mb={6} borderRadius="xl">
            <AlertIcon />
            <AlertTitle>Configuration Required!</AlertTitle>
            <AlertDescription>
              Supabase environment variables are not configured. Please set{' '}
              <Code>NEXT_PUBLIC_SUPABASE_URL</Code> and{' '}
              <Code>NEXT_PUBLIC_SUPABASE_ANON_KEY</Code> in your{' '}
              <Code>.env.local</Code> file.
            </AlertDescription>
          </Alert>
        )}

        {/* API Status */}
        {!apiAvailable && (
          <Alert status="info" mb={6} borderRadius="xl">
            <AlertIcon />
            <AlertTitle>API Backend Not Running</AlertTitle>
            <AlertDescription>
              The API backend (port 8000) is not available. Showing mock data for demonstration.
              Start the backend with <Code>docker-compose up</Code> to see live data.
            </AlertDescription>
          </Alert>
        )}

        {/* Summary Cards */}
        <Grid templateColumns={{ base: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }} gap={6} mb={8}>
          <Card bg={glassBg} backdropFilter="blur(10px)" borderRadius="xl" shadow="lg">
            <CardBody p={6}>
              <Stat>
                <StatLabel color="gray.500" fontSize="sm">Total Bandwidth Today</StatLabel>
                <StatNumber color="blue.600" fontSize="3xl" fontWeight="bold">
                  {totalBandwidth.toFixed(0)} Mbps
                </StatNumber>
              </Stat>
            </CardBody>
          </Card>

          <Card bg={glassBg} backdropFilter="blur(10px)" borderRadius="xl" shadow="lg">
            <CardBody p={6}>
              <Stat>
                <StatLabel color="gray.500" fontSize="sm">Active Resellers</StatLabel>
                <StatNumber color="blue.600" fontSize="3xl" fontWeight="bold">
                  {activeVLANs}
                </StatNumber>
              </Stat>
            </CardBody>
          </Card>

          <Card bg={glassBg} backdropFilter="blur(10px)" borderRadius="xl" shadow="lg">
            <CardBody p={6}>
              <Stat>
                <StatLabel color="gray.500" fontSize="sm">Alerts (24h)</StatLabel>
                <StatNumber color="red.600" fontSize="3xl" fontWeight="bold">
                  {alertCount}
                </StatNumber>
              </Stat>
            </CardBody>
          </Card>

          <Card bg={glassBg} backdropFilter="blur(10px)" borderRadius="xl" shadow="lg">
            <CardBody p={6}>
              <Stat>
                <StatLabel color="gray.500" fontSize="sm">Links Down</StatLabel>
                <StatNumber color="yellow.600" fontSize="3xl" fontWeight="bold">
                  {linksDown}
                </StatNumber>
              </Stat>
            </CardBody>
          </Card>
        </Grid>

        {/* Main Content Tabs */}
        <Tabs variant="enclosed" index={activeTab} onChange={(index) => {
          setActiveTab(index);
          setShowManagement(index === 1);
        }}>
          <TabList mb={6}>
            <Tab>Dashboard View</Tab>
            <Tab>Manage Resellers</Tab>
            <Tab>Leaderboard</Tab>
            <Tab>NTTN Links</Tab>
          </TabList>

          <TabPanels>
            {/* Dashboard Tab */}
            <TabPanel p={0}>
              <VStack spacing={6} align="stretch">
                {/* Real-time Traffic Chart */}
                <Card bg={glassBg} backdropFilter="blur(10px)" borderRadius="xl" shadow="lg">
                  <CardHeader>
                    <Heading size="md">VLAN / Interface Traffic (Real-time)</Heading>
                  </CardHeader>
                  <CardBody>
                    <BandwidthChart resellers={resellers} />
                  </CardBody>
                </Card>

                {/* Reseller Overview Table */}
                <Card bg={glassBg} backdropFilter="blur(10px)" borderRadius="xl" shadow="lg">
                  <CardHeader>
                    <Heading size="md">Reseller Overview</Heading>
                  </CardHeader>
                  <CardBody>
                    <Table variant="simple">
                      <Thead>
                        <Tr>
                          <Th>Reseller</Th>
                          <Th>Plan</Th>
                          <Th>Current Usage</Th>
                          <Th>Utilization</Th>
                          <Th>Link Status</Th>
                          <Th>Actions</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {resellers.map((reseller) => (
                          <Tr key={reseller.id}>
                            <Td>
                              <Text 
                                fontWeight="bold" 
                                cursor="pointer" 
                                color="blue.500"
                                _hover={{ textDecoration: 'underline' }}
                                onClick={() => handleResellerClick(reseller.id)}
                              >
                                {reseller.name}
                              </Text>
                            </Td>
                            <Td>{reseller.plan_mbps} Mbps</Td>
                            <Td>{(currentUsage[reseller.id] || 0).toFixed(1)} Mbps</Td>
                            <Td>{getUtilizationBadge(reseller)}</Td>
                            <Td>{getLinkStatusBadge(reseller.id)}</Td>
                            <Td>
                              <ResellerActionButtons
                                reseller={reseller}
                                onEdit={handleEditReseller}
                                onDelete={handleDeleteReseller}
                              />
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>

                    {resellers.length === 0 && (
                      <Center p={8}>
                        <Text color="gray.500">No resellers found</Text>
                      </Center>
                    )}
                  </CardBody>
                </Card>

                {/* Additional Cards Row */}
                <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={6}>
                  <Card bg={glassBg} backdropFilter="blur(10px)" borderRadius="xl" shadow="lg">
                    <CardHeader>
                      <Heading size="md">NTTN Aggregated Link</Heading>
                    </CardHeader>
                    <CardBody>
                      <NTTNChart resellers={resellers} />
                    </CardBody>
                  </Card>

                  <Card bg={glassBg} backdropFilter="blur(10px)" borderRadius="xl" shadow="lg">
                    <CardHeader>
                      <Heading size="md">Latest Alerts</Heading>
                    </CardHeader>
                    <CardBody>
                      <VStack spacing={3} align="stretch">
                        <Alert status="error" borderRadius="md">
                          <AlertIcon />
                          <Text fontSize="sm">VLAN 40 reached 95% bandwidth at 14:05</Text>
                        </Alert>
                        <Alert status="warning" borderRadius="md">
                          <AlertIcon />
                          <Text fontSize="sm">Link 1 ping loss detected 13:59</Text>
                        </Alert>
                        <Alert status="error" borderRadius="md">
                          <AlertIcon />
                          <Text fontSize="sm">NTTN Total exceeded 90% at 13:45</Text>
                        </Alert>
                      </VStack>
                    </CardBody>
                  </Card>
                </Grid>
              </VStack>
            </TabPanel>

            {/* Management Tab */}
            <TabPanel p={0}>
              <Card bg={glassBg} backdropFilter="blur(10px)" borderRadius="xl" shadow="lg">
                <CardBody>
                  <ResellerManagement 
                    resellers={resellers}
                    onResellerChange={handleResellerChange}
                    initialReseller={managingReseller}
                    onResellerManaged={() => {
                      setManagingReseller(null);
                      setShowManagement(false);
                      setActiveTab(0); // Switch back to dashboard tab
                    }}
                  />
                </CardBody>
              </Card>
            </TabPanel>

            {/* Leaderboard Tab */}
            <TabPanel p={0}>
              <ResellerLeaderboard />
            </TabPanel>

                         {/* NTTN Links Tab */}
             <TabPanel p={0}>
               <NTTNManagement />
             </TabPanel>
          </TabPanels>
        </Tabs>
      </Container>

      {/* Delete Dialog */}
      <AlertDialog
        isOpen={isDeleteOpen}
        leastDestructiveRef={cancelRef}
        onClose={onDeleteClose}
        isCentered
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Reseller
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure? You can't undo this action afterwards.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onDeleteClose}>Cancel</Button>
              <Button colorScheme="red" onClick={() => {
                if (deletingReseller) {
                  setIsDeleting(true);
                  apiClient.deleteReseller(deletingReseller.id)
                    .then(() => {
                      toast({
                        title: `Reseller "${deletingReseller.name}" deleted.`,
                        description: `Reseller ID: ${deletingReseller.id}`,
                        status: "success",
                        duration: 5000,
                        isClosable: true,
                      });
                      loadData(); // Refresh data after deletion
                      onDeleteClose();
                    })
                    .catch((error) => {
                      toast({
                        title: "Error deleting reseller",
                        description: error.message,
                        status: "error",
                        duration: 5000,
                        isClosable: true,
                      });
                    })
                    .finally(() => setIsDeleting(false));
                }
              }} isLoading={isDeleting}>
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      {/* Footer */}
      <Box bg="gray.900" color="gray.300" py={4}>
        <Container maxW="7xl">
          <Text textAlign="center" fontSize="sm">
            © 2025 PHP Computer — Powered by ISP Bandwidth Tracker
          </Text>
        </Container>
      </Box>
    </Box>
  );
} 