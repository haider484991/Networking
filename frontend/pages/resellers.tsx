import React from 'react';
import { Box, Heading, Container } from '@chakra-ui/react';
import SettingsResellerManagement from '../components/SettingsResellerManagement';

export default function ResellersPage() {
  return (
    <Box minH="100vh" bg="gray.50">
      <Container maxW="7xl" px={6} py={8}>
        <Heading as="h1" size="lg" mb={6}>Reseller Management</Heading>
        <SettingsResellerManagement />
      </Container>
    </Box>
  );
} 