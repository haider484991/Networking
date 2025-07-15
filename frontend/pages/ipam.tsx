import React from 'react';
import { Box, Heading } from '@chakra-ui/react';
import IPAMManagement from '../components/IPAMManagement';

const IPAMPage = () => {
  return (
    <Box>
      <Heading mb={4}>IP Address Management</Heading>
      <IPAMManagement />
    </Box>
  );
};

export default IPAMPage;