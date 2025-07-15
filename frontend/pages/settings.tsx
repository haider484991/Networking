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
  Spacer,
  Card,
  CardBody,
  Grid,
  GridItem,
  Icon
} from '@chakra-ui/react';
import Link from 'next/link';
import { SettingsIcon, ViewIcon, PhoneIcon, AddIcon, LockIcon } from '@chakra-ui/icons';
// import { useAuth } from '../hooks/useAuth';

// Component imports
import RouterManagement from '../components/RouterManagement';
import DeviceMonitoring from '../components/DeviceMonitoring';
import ResellerManagement from '../components/SettingsResellerManagement';

interface TabItem {
  id: string;
  label: string;
  icon: React.ElementType;
  component: React.ComponentType<{onAlert: (message: string, type: 'success' | 'error') => void}>;
  description: string;
}

const SettingsPage: React.FC = () => {
  // const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<number>(0);
  const [alert, setAlert] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const tabs: TabItem[] = [
    {
      id: 'routers',
      label: 'Router Management',
      icon: ViewIcon,
      description: 'Configure and monitor network routers',
      component: RouterManagement
    },
    {
      id: 'devices',
      label: 'Network Devices',
      icon: PhoneIcon,
      description: 'Monitor connected network devices',
      component: DeviceMonitoring
    },
    {
      id: 'resellers',
      label: 'Reseller Management',
      icon: AddIcon,
      description: 'Manage reseller accounts and permissions',
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

      <Box
        minH="100vh"
        bgGradient="linear(135deg, blue.50, purple.50, pink.50)"
        position="relative"
        _before={{
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(79, 70, 229, 0.1) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(236, 72, 153, 0.1) 0%, transparent 50%)',
          pointerEvents: 'none'
        }}
      >
        {/* Header Section */}
        <Box
          bgGradient="linear(135deg, blue.600, purple.600, pink.500)"
          color="white"
          py={12}
          mb={8}
          position="relative"
          _before={{
            content: '""',
            position: 'absolute',
            inset: 0,
            bgGradient: 'linear(45deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
            backdropFilter: 'blur(10px)'
          }}
        >
          <Container maxW="7xl" position="relative" zIndex={1}>
            <VStack align="start" spacing={6}>
              {/* Navigation Breadcrumb */}
              <Card
                bg="rgba(255, 255, 255, 0.1)"
                backdropFilter="blur(10px)"
                border="1px solid rgba(255, 255, 255, 0.2)"
                shadow="xl"
                borderRadius="xl"
                p={4}
              >
                <HStack spacing={6} fontSize="sm" color="whiteAlpha.900">
                  <Link href="/dashboard">
                    <Text cursor="pointer" _hover={{ color: 'white', textDecoration: 'underline' }}>
                      📊 Dashboard
                    </Text>
                  </Link>
                  <Link href="/devices">
                    <Text cursor="pointer" _hover={{ color: 'white', textDecoration: 'underline' }}>
                      📱 Devices
                    </Text>
                  </Link>
                  <Link href="/resellers">
                    <Text cursor="pointer" _hover={{ color: 'white', textDecoration: 'underline' }}>
                      👥 Resellers
                    </Text>
                  </Link>
                  <Link href="/alerts">
                    <Text cursor="pointer" _hover={{ color: 'white', textDecoration: 'underline' }}>
                      🚨 Alerts
                    </Text>
                  </Link>
                  <Text color="white" fontWeight="bold" display="flex" alignItems="center" gap={2}>
                    <Icon as={SettingsIcon} />
                    Settings
                  </Text>
                </HStack>
              </Card>
              
              {/* Title Section */}
              <VStack align="start" spacing={4}>
                <HStack spacing={3}>
                  <Icon as={LockIcon} boxSize={10} />
                  <Heading as="h1" size="2xl" fontWeight="bold" textShadow="2px 2px 4px rgba(0,0,0,0.3)">
                    ISP Admin Settings
                  </Heading>
                </HStack>
                
                <Text fontSize="xl" opacity={0.95} maxW="600px" textShadow="1px 1px 2px rgba(0,0,0,0.2)">
                  Comprehensive administration panel for managing routers, monitoring devices, and configuring resellers
                </Text>
                
                {/* Feature Badges */}
                <HStack spacing={3} flexWrap="wrap">
                  <Badge
                    bg="rgba(72, 187, 120, 0.2)"
                    color="green.100"
                    px={4}
                    py={2}
                    borderRadius="full"
                    border="1px solid rgba(72, 187, 120, 0.3)"
                    backdropFilter="blur(10px)"
                    fontSize="sm"
                    fontWeight="semibold"
                  >
                    🌐 ROUTER CONTROL
                  </Badge>
                  <Badge
                    bg="rgba(66, 153, 225, 0.2)"
                    color="blue.100"
                    px={4}
                    py={2}
                    borderRadius="full"
                    border="1px solid rgba(66, 153, 225, 0.3)"
                    backdropFilter="blur(10px)"
                    fontSize="sm"
                    fontWeight="semibold"
                  >
                    📱 DEVICE MONITORING
                  </Badge>
                  <Badge
                    bg="rgba(159, 122, 234, 0.2)"
                    color="purple.100"
                    px={4}
                    py={2}
                    borderRadius="full"
                    border="1px solid rgba(159, 122, 234, 0.3)"
                    backdropFilter="blur(10px)"
                    fontSize="sm"
                    fontWeight="semibold"
                  >
                    👥 RESELLER MANAGEMENT
                  </Badge>
                </HStack>
              </VStack>
            </VStack>
          </Container>
        </Box>

        {/* Main Content */}
        <Container maxW="7xl" px={6} position="relative" zIndex={1}>
          <Card
            bg="rgba(255, 255, 255, 0.9)"
            backdropFilter="blur(20px)"
            border="1px solid rgba(255, 255, 255, 0.3)"
            shadow="2xl"
            borderRadius="2xl"
            overflow="hidden"
          >
            <Tabs 
              index={activeTab} 
              onChange={setActiveTab}
              variant="unstyled"
              colorScheme="blue"
            >
              <TabList 
                bg="rgba(247, 250, 252, 0.8)"
                backdropFilter="blur(10px)"
                borderBottom="1px solid rgba(226, 232, 240, 0.5)"
                px={6}
                py={4}
              >
                <Grid templateColumns="repeat(auto-fit, minmax(250px, 1fr))" gap={4} w="full">
                  {tabs.map((tab, index) => (
                    <GridItem key={tab.id}>
                      <Tab
                        p={0}
                        w="full"
                        _selected={{}}
                        _hover={{}}
                        _focus={{ boxShadow: 'none' }}
                      >
                        <Card
                          w="full"
                          bg={activeTab === index 
                            ? "rgba(66, 153, 225, 0.1)" 
                            : "rgba(255, 255, 255, 0.6)"
                          }
                          border={activeTab === index 
                            ? "2px solid rgba(66, 153, 225, 0.3)" 
                            : "1px solid rgba(226, 232, 240, 0.5)"
                          }
                          backdropFilter="blur(10px)"
                          shadow={activeTab === index ? "lg" : "sm"}
                          borderRadius="xl"
                          transition="all 0.3s ease"
                          _hover={{
                            transform: "translateY(-2px)",
                            shadow: "lg",
                            bg: activeTab === index 
                              ? "rgba(66, 153, 225, 0.15)" 
                              : "rgba(255, 255, 255, 0.8)"
                          }}
                        >
                          <CardBody p={6}>
                            <VStack spacing={3}>
                              <Box
                                p={3}
                                borderRadius="full"
                                bg={activeTab === index 
                                  ? "rgba(66, 153, 225, 0.2)" 
                                  : "rgba(113, 128, 150, 0.1)"
                                }
                              >
                                <Icon 
                                  as={tab.icon} 
                                  boxSize={6}
                                  color={activeTab === index ? "blue.600" : "gray.600"}
                                />
                              </Box>
                              <VStack spacing={1}>
                                <Text 
                                  fontWeight="bold" 
                                  fontSize="lg"
                                  color={activeTab === index ? "blue.700" : "gray.700"}
                                >
                                  {tab.label}
                                </Text>
                                <Text 
                                  fontSize="sm" 
                                  color="gray.600" 
                                  textAlign="center"
                                  opacity={0.8}
                                >
                                  {tab.description}
                                </Text>
                              </VStack>
                            </VStack>
                          </CardBody>
                        </Card>
                      </Tab>
                    </GridItem>
                  ))}
                </Grid>
              </TabList>

              <TabPanels>
                {tabs.map((tab, index) => (
                  <TabPanel key={tab.id} p={8}>
                    <tab.component onAlert={showAlert} />
                  </TabPanel>
                ))}
              </TabPanels>
            </Tabs>
          </Card>
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
              borderRadius="xl"
              boxShadow="2xl"
              bg="rgba(255, 255, 255, 0.95)"
              backdropFilter="blur(20px)"
              border="1px solid rgba(255, 255, 255, 0.3)"
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