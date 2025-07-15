import React from 'react';
import {
  Box,
  Heading,
  Container,
  VStack,
  HStack,
  Text,
  Badge,
  useColorModeValue,
  Spacer
} from '@chakra-ui/react';
import SettingsResellerManagement from '../components/SettingsResellerManagement';
import Link from 'next/link';

export default function ResellersPage() {
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  const headerBg = useColorModeValue('blue.600', 'blue.400');

  const handleAlert = (message: string, type: 'success' | 'error') => {
    console.log(`${type}: ${message}`);
  };

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
                <Text cursor="pointer" fontWeight="bold" borderBottom="2px solid white">Resellers</Text>
              </Link>
              <Link href="/alerts">
                <Text cursor="pointer" _hover={{ color: 'blue.200' }}>Alerts</Text>
              </Link>
              <Spacer />
              <Link href="/settings">
                <Text cursor="pointer" _hover={{ color: 'blue.200' }}>Settings</Text>
              </Link>
            </HStack>

            <Heading as="h1" size="xl" fontWeight="bold">
              Reseller Management
            </Heading>

            <Text fontSize="lg" opacity={0.9}>
              Manage reseller accounts, bandwidth plans, and router assignments
            </Text>

            <HStack spacing={4}>
              <Badge colorScheme="green" px={3} py={1} borderRadius="full">
                Account Management
              </Badge>
              <Badge colorScheme="blue" px={3} py={1} borderRadius="full">
                Bandwidth Control
              </Badge>
              <Badge colorScheme="purple" px={3} py={1} borderRadius="full">
                Router Assignment
              </Badge>
            </HStack>
          </VStack>
        </Container>
      </Box>

      {/* Main Content */}
      <Container maxW="7xl" px={6}>
        <Box bg={cardBg} borderRadius="xl" shadow="lg" p={6}>
          <SettingsResellerManagement onAlert={handleAlert} />
        </Box>
      </Container>
    </Box>
  );
} 