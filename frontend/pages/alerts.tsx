import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Heading, 
  Container, 
  VStack, 
  HStack,
  Text, 
  Badge, 
  Spinner,
  useColorModeValue,
  Card,
  CardBody,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Alert,
  AlertIcon,
  AlertDescription,
  Flex,
  Spacer,
  Icon
} from '@chakra-ui/react';
import { Alert as AlertType } from '../utils/api';
import Link from 'next/link';
import { WarningIcon, InfoIcon, WarningTwoIcon } from '@chakra-ui/icons';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [loading, setLoading] = useState(true);

  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  const headerBg = useColorModeValue('blue.600', 'blue.400');

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
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  const getBadgeColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'critical': 
      case 'red':
        return 'red';
      case 'warning': 
      case 'yellow':
        return 'yellow';
      case 'link_down':
        return 'orange';
      case 'info':
        return 'blue';
      default: 
        return 'gray';
    }
  };

  const getAlertIcon = (level: string) => {
    switch (level.toLowerCase()) {
      case 'critical':
      case 'red':
        return WarningTwoIcon;
      case 'warning':
      case 'yellow':
        return WarningIcon;
      default:
        return InfoIcon;
    }
  };

  const getAlertStats = () => {
    const critical = alerts.filter(a => ['critical', 'red'].includes(a.level.toLowerCase())).length;
    const warnings = alerts.filter(a => ['warning', 'yellow'].includes(a.level.toLowerCase())).length;
    const linkDown = alerts.filter(a => a.level.toLowerCase() === 'link_down').length;
    
    return { critical, warnings, linkDown, total: alerts.length };
  };

  const stats = getAlertStats();

  return (
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
                <Text cursor="pointer" fontWeight="bold" borderBottom="2px solid white">Alerts</Text>
              </Link>
              <Spacer />
              <Link href="/settings">
                <Text cursor="pointer" _hover={{ color: 'blue.200' }}>Settings</Text>
              </Link>
            </HStack>
            
            <Heading as="h1" size="xl" fontWeight="bold">
              System Alerts
            </Heading>
            
            <Text fontSize="lg" opacity={0.9}>
              Monitor critical events and system notifications
            </Text>
            
            <HStack spacing={4}>
              <Badge colorScheme="red" px={3} py={1} borderRadius="full">
                {stats.critical} Critical
              </Badge>
              <Badge colorScheme="yellow" px={3} py={1} borderRadius="full">
                {stats.warnings} Warnings
              </Badge>
              <Badge colorScheme="orange" px={3} py={1} borderRadius="full">
                {stats.linkDown} Link Down
              </Badge>
            </HStack>
          </VStack>
        </Container>
      </Box>

      {/* Main Content */}
      <Container maxW="7xl" px={6}>
        {/* Stats Cards */}
        <SimpleGrid columns={{ base: 1, md: 4 }} spacing={6} mb={8}>
          <Card bg={cardBg} shadow="md">
            <CardBody>
              <Stat>
                <StatLabel>Total Alerts</StatLabel>
                <StatNumber color="blue.500">{stats.total}</StatNumber>
                <StatHelpText>All time</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
          
          <Card bg={cardBg} shadow="md">
            <CardBody>
              <Stat>
                <StatLabel>Critical</StatLabel>
                <StatNumber color="red.500">{stats.critical}</StatNumber>
                <StatHelpText>Immediate attention</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
          
          <Card bg={cardBg} shadow="md">
            <CardBody>
              <Stat>
                <StatLabel>Warnings</StatLabel>
                <StatNumber color="yellow.500">{stats.warnings}</StatNumber>
                <StatHelpText>Monitor closely</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
          
          <Card bg={cardBg} shadow="md">
            <CardBody>
              <Stat>
                <StatLabel>Link Down</StatLabel>
                <StatNumber color="orange.500">{stats.linkDown}</StatNumber>
                <StatHelpText>Connection issues</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        </SimpleGrid>

        {/* Alerts List */}
        <Box bg={cardBg} borderRadius="xl" shadow="lg" p={6}>
          <Heading as="h2" size="lg" mb={6}>Recent Alerts</Heading>
          
          {loading ? (
            <Flex justify="center" align="center" py={12}>
              <VStack spacing={4}>
                <Spinner size="xl" color="blue.500" />
                <Text>Loading alerts...</Text>
              </VStack>
            </Flex>
          ) : alerts.length === 0 ? (
            <Alert status="info" borderRadius="md">
              <AlertIcon />
              <AlertDescription>No alerts found. Your system is running smoothly!</AlertDescription>
            </Alert>
          ) : (
            <VStack spacing={4} align="stretch">
              {alerts.map((alert, index) => (
                <Card key={index} variant="outline" borderLeft="4px solid" borderLeftColor={`${getBadgeColor(alert.level)}.400`}>
                  <CardBody>
                    <Flex align="start" justify="space-between">
                      <HStack spacing={3} flex={1}>
                        <Icon as={getAlertIcon(alert.level)} color={`${getBadgeColor(alert.level)}.500`} boxSize={5} />
                        <VStack align="start" spacing={1} flex={1}>
                          <HStack spacing={3}>
                            <Badge colorScheme={getBadgeColor(alert.level)} size="sm">
                              {alert.level.toUpperCase()}
                            </Badge>
                            {alert.reseller_id && (
                              <Badge variant="outline" size="sm">
                                {alert.reseller_id}
                              </Badge>
                            )}
                          </HStack>
                          <Text fontWeight="medium" color={useColorModeValue('gray.800', 'white')}>
                            {alert.message}
                          </Text>
                        </VStack>
                      </HStack>
                      <Text fontSize="sm" color="gray.500">
                        {new Date(alert.sent_at).toLocaleString()}
                      </Text>
                    </Flex>
                  </CardBody>
                </Card>
              ))}
            </VStack>
          )}
        </Box>
      </Container>
    </Box>
  );
} 