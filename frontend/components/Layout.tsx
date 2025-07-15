import React from 'react';
import { Box, Flex, HStack, Link, VStack } from '@chakra-ui/react';
import NextLink from 'next/link';

const Layout = ({ children }) => {
  return (
    <Box>
      <Flex as="nav" bg="gray.100" p={4}>
        <HStack spacing={8}>
          <NextLink href="/" passHref>
            <Link>Dashboard</Link>
          </NextLink>
          <NextLink href="/routers" passHref>
            <Link>Routers</Link>
          </NextLink>
          <NextLink href="/ipam" passHref>
            <Link>IPAM</Link>
          </NextLink>
          <NextLink href="/resellers" passHref>
            <Link>Resellers</Link>
          </NextLink>
        </HStack>
      </Flex>
      <Box p={8}>{children}</Box>
    </Box>
  );
};

export default Layout;