import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { 
  Box, 
  Container, 
  Heading, 
  Text, 
  Tabs, 
  TabList, 
  TabPanels, 
  Tab, 
  TabPanel,
  VStack,
  HStack,
  Badge,
  useColorModeValue,
  Alert,
  AlertIcon,
  AlertDescription,
  CloseButton,
  Flex,
  Spacer
} from '@chakra-ui/react';
import Link from 'next/link';
// import { useAuth } from '../hooks/useAuth';

// Component imports
import RouterManagement from '../components/RouterManagement';
import DeviceMonitoring from '../components/DeviceMonitoring';
import ResellerManagement from '../components/SettingsResellerManagement';

interface TabItem {
  id: string;
  label: string;
  icon: string;
  component: React.ComponentType<{onAlert: (message: string, type: 'success' | 'error') => void}>;
}

const SettingsPage: React.FC = () => {
  // const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<number>(0);
  const [alert, setAlert] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  const headerBg = useColorModeValue('blue.600', 'blue.400');

  const tabs: TabItem[] = [
    {
      id: 'routers',
      label: 'Router Management',
      icon: '🌐',
      component: RouterManagement
    },
    {
      id: 'devices',
      label: 'Network Devices',
      icon: '📱',
      component: DeviceMonitoring
    },
    {
      id: 'resellers',
      label: 'Reseller Management',
      icon: '👥',
      component: ResellerManagement
    }
  ];

  const showAlert = (message: string, type: 'success' | 'error') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 5000);
  };

  return (
    <>
      <Head>
        <title>ISP Settings - Admin Dashboard</title>
        <meta name="description" content="Comprehensive ISP admin settings for router, device, and reseller management" />
      </Head>

      <Box minH="100vh" bg={bgColor}>
        {/* Header Section */}
        <Box bg={headerBg} color="white" py={8} mb={8}>
          <Container maxW="7xl">
            <VStack align="start" spacing={4}>
              <HStack spacing={6} fontSize="sm">
                <Link href="/dashboard">
                  <Text cursor="pointer" _hover={{ color: 'blue.200' }}>Dashboard</Text>
                </Link>
                <Link href="/devices">
                  <Text cursor="pointer" _hover={{ color: 'blue.200' }}>Devices</Text>
                </Link>
                <Link href="/resellers">
                  <Text cursor="pointer" _hover={{ color: 'blue.200' }}>Resellers</Text>
                </Link>
                <Link href="/alerts">
                  <Text cursor="pointer" _hover={{ color: 'blue.200' }}>Alerts</Text>
                </Link>
                <Spacer />
                <Link href="/settings">
                  <Text cursor="pointer" fontWeight="bold" borderBottom="2px solid white">Settings</Text>
                </Link>
              </HStack>
              
              <Heading as="h1" size="xl" fontWeight="bold">
                ISP Admin Settings
              </Heading>
              
              <Text fontSize="lg" opacity={0.9}>
                Manage routers, monitor devices, and configure resellers
              </Text>
              
              <HStack spacing={4}>
                <Badge colorScheme="green" px={3} py={1} borderRadius="full">
                  Router Control
                </Badge>
                <Badge colorScheme="blue" px={3} py={1} borderRadius="full">
                  Device Monitoring
                </Badge>
                <Badge colorScheme="purple" px={3} py={1} borderRadius="full">
                  Reseller Management
                </Badge>
              </HStack>
            </VStack>
          </Container>
        </Box>

        {/* Main Content */}
        <Container maxW="7xl" px={6}>
          <Box bg={cardBg} borderRadius="xl" shadow="lg" overflow="hidden">
            <Tabs 
              index={activeTab} 
              onChange={setActiveTab}
              variant="enclosed"
              colorScheme="blue"
            >
              <TabList bg={useColorModeValue('gray.100', 'gray.700')} px={6}>
                {tabs.map((tab, index) => (
                  <Tab 
                    key={tab.id}
                    fontWeight="medium"
                    _selected={{
                      bg: cardBg,
                      borderBottomColor: cardBg,
                      borderTopColor: 'blue.500',
                      borderTopWidth: '3px'
                    }}
                  >
                    <HStack spacing={2}>
                      <Text fontSize="lg">{tab.icon}</Text>
                      <Text>{tab.label}</Text>
                    </HStack>
                  </Tab>
                ))}
              </TabList>

              <TabPanels>
                {tabs.map((tab, index) => (
                  <TabPanel key={tab.id} p={8}>
                    <tab.component onAlert={showAlert} />
                  </TabPanel>
                ))}
              </TabPanels>
            </Tabs>
          </Box>
        </Container>

        {/* Alert Toast */}
        {alert && (
          <Box
            position="fixed"
            top={4}
            right={4}
            zIndex={50}
            maxW="md"
          >
            <Alert 
              status={alert.type === 'success' ? 'success' : 'error'}
              borderRadius="md"
              boxShadow="lg"
            >
              <AlertIcon />
              <Box flex="1">
                <AlertDescription>{alert.message}</AlertDescription>
              </Box>
              <CloseButton
                onClick={() => setAlert(null)}
                position="absolute"
                right="8px"
                top="8px"
              />
            </Alert>
          </Box>
        )}
      </Box>
    </>
  );
};

export default SettingsPage; 