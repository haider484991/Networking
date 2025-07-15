import React from 'react';
import { Box, Heading, Container } from '@chakra-ui/react';
import DeviceMonitoring from '../components/DeviceMonitoring';

export default function DevicesPage() {
  const handleAlert = (message: string, type: 'success' | 'error') => {
    console.log(`${type}: ${message}`);
  };

  return (
    <Box minH="100vh" bg="gray.50">
      <Container maxW="7xl" px={6} py={8}>
        <Heading as="h1" size="lg" mb={6}>Network Devices</Heading>
        <DeviceMonitoring onAlert={handleAlert} />
      </Container>
    </Box>
  );
} 