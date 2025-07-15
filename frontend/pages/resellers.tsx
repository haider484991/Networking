import React from 'react';
import { Box, Heading } from '@chakra-ui/react';
import ResellerManagement from '../components/ResellerManagement';

const ResellersPage = () => {
  return (
    <Box>
      <Heading mb={4}>Resellers</Heading>
      <ResellerManagement />
    </Box>
  );
};

export default ResellersPage;