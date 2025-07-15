import React, { useState, useEffect } from 'react';
import { Box, Heading, Container } from '@chakra-ui/react';
import ResellerManagement from '../components/ResellerManagement';
import { Reseller } from '../utils/api';

export default function ResellersPage() {
  const [resellers, setResellers] = useState<Reseller[]>([]);

  const fetchResellers = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/resellers`);
      if (response.ok) {
        const data = await response.json();
        setResellers(data);
      }
    } catch (error) {
      console.error('Failed to fetch resellers:', error);
    }
  };

  useEffect(() => {
    fetchResellers();
  }, []);

  const handleResellerChange = () => {
    fetchResellers();
  };

  return (
    <Box minH="100vh" bg="gray.50">
      <Container maxW="7xl" px={6} py={8}>
        <Heading as="h1" size="lg" mb={6}>Reseller Management</Heading>
        <ResellerManagement 
          resellers={resellers} 
          onResellerChange={handleResellerChange} 
        />
      </Container>
    </Box>
  );
} 