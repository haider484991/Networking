import React from 'react';
import { Box, Heading } from '@chakra-ui/react';
import RouterManagement from '../components/RouterManagement';

const RoutersPage = () => {
  return (
    <Box>
      <Heading mb={4}>Routers</Heading>
      <RouterManagement onAlert={() => {}} />
    </Box>
  );
};

export default RoutersPage;