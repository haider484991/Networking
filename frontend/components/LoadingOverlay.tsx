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
  // Always return null to make loading invisible
  return null;
};

export default LoadingOverlay; 