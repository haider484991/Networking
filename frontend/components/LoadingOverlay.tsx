import React from 'react';
import {
  Box,
  Text,
  VStack,
  Spinner,
  Portal,
  useColorModeValue,
  Fade,
  Center,
  Progress,
  Badge,
  HStack,
  Icon,
  Skeleton,
  SkeletonText,
  Stack,
} from '@chakra-ui/react';
import { CheckCircleIcon, TimeIcon } from '@chakra-ui/icons';

interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  showProgress?: boolean;
  type?: 'page' | 'component' | 'overlay';
  height?: string | number;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ 
  isLoading, 
  message = "Loading...", 
  showProgress = false,
  type = 'component',
  height = "200px"
}) => {
  if (!isLoading) return null;

  if (type === 'component') {
    return (
      <Center h={height}>
        <VStack spacing={4}>
          <Spinner size="xl" color="blue.500" thickness="4px" />
          <Text color="gray.500" fontSize="lg">{message}</Text>
          {showProgress && (
            <Progress size="sm" isIndeterminate colorScheme="blue" width="200px" />
          )}
        </VStack>
      </Center>
    );
  }

  return (
    <Portal>
      <Fade in={isLoading}>
        <Box
          position="fixed"
          top={0}
          left={0}
          right={0}
          bottom={0}
          bg="blackAlpha.600"
          zIndex={9999}
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <VStack
            bg="white"
            p={8}
            borderRadius="xl"
            shadow="xl"
            spacing={4}
            minW="300px"
          >
            <Spinner size="xl" color="blue.500" thickness="4px" />
            <Text fontSize="lg" fontWeight="medium">{message}</Text>
            {showProgress && (
              <Progress size="lg" isIndeterminate colorScheme="blue" width="100%" />
            )}
          </VStack>
        </Box>
      </Fade>
    </Portal>
  );
};

// Skeleton components for different UI elements
export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({ 
  rows = 3, 
  columns = 4 
}) => (
  <Stack spacing={3}>
    {Array.from({ length: rows }).map((_, index) => (
      <HStack key={index} spacing={4}>
        {Array.from({ length: columns }).map((_, colIndex) => (
          <Skeleton key={colIndex} height="40px" flex="1" borderRadius="md" />
        ))}
      </HStack>
    ))}
  </Stack>
);

export const CardSkeleton: React.FC<{ height?: string }> = ({ height = "200px" }) => (
  <Box p={6} borderRadius="xl" bg="white" shadow="lg">
    <VStack spacing={4} align="stretch">
      <Skeleton height="24px" width="60%" />
      <SkeletonText noOfLines={3} spacing="4" />
      <Skeleton height={height} borderRadius="md" />
    </VStack>
  </Box>
);

export const StatSkeleton: React.FC = () => (
  <VStack spacing={2} align="stretch">
    <Skeleton height="16px" width="70%" />
    <Skeleton height="32px" width="50%" />
  </VStack>
);

export default LoadingOverlay; 