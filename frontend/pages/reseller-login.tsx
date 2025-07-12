import { useState } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
  Heading,
  Text,
  Alert,
  AlertIcon,
  Card,
  CardBody,
  Center,
  useToast,
  Divider,
  HStack,
} from '@chakra-ui/react';
import { apiClient } from '../utils/api';

export default function ResellerLogin() {
  const [resellerId, setResellerId] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const toast = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate reseller exists
      const reseller = await apiClient.getReseller(resellerId);
      
      // Simple access code validation (in production, use proper authentication)
      // For demo, accept phone number as access code
      if (accessCode === reseller.phone) {
        // Store reseller session
        localStorage.setItem('reseller_session', JSON.stringify({
          id: reseller.id,
          name: reseller.name,
          loginTime: new Date().toISOString()
        }));
        
        toast({
          title: 'Login Successful',
          description: `Welcome, ${reseller.name}!`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        
        // Redirect to reseller dashboard
        router.push(`/reseller-dashboard/${reseller.id}`);
      } else {
        toast({
          title: 'Invalid Access Code',
          description: 'Please check your access code and try again.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast({
        title: 'Login Failed',
        description: 'Reseller ID not found or invalid.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = (demoResellerId: string) => {
    setResellerId(demoResellerId);
    // Set demo access code based on reseller ID
    const demoCodes = {
      'r1': '+8801000000001',
      'r2': '+8801000000002',
      'r3': '+8801000000003',
      'r4': '+8801000000004',
    };
    setAccessCode(demoCodes[demoResellerId] || '');
  };

  return (
    <Center minH="100vh" bg="gray.50">
      <Box maxW="md" w="full" p={8}>
        <Card>
          <CardBody>
            <VStack spacing={6}>
              <Heading as="h1" size="lg" textAlign="center" color="blue.600">
                Reseller Portal
              </Heading>
              <Text textAlign="center" color="gray.600">
                Access your bandwidth usage dashboard
              </Text>

              <form onSubmit={handleLogin} style={{ width: '100%' }}>
                <VStack spacing={4}>
                  <FormControl isRequired>
                    <FormLabel>Reseller ID</FormLabel>
                    <Input
                      value={resellerId}
                      onChange={(e) => setResellerId(e.target.value)}
                      placeholder="Enter your reseller ID (e.g., r1, r2, r3, r4)"
                      size="lg"
                    />
                  </FormControl>

                  <FormControl isRequired>
                    <FormLabel>Access Code</FormLabel>
                    <Input
                      type="password"
                      value={accessCode}
                      onChange={(e) => setAccessCode(e.target.value)}
                      placeholder="Enter your access code (phone number)"
                      size="lg"
                    />
                  </FormControl>

                  <Button
                    type="submit"
                    colorScheme="blue"
                    size="lg"
                    width="full"
                    isLoading={isLoading}
                    loadingText="Logging in..."
                  >
                    Login
                  </Button>
                </VStack>
              </form>

              <Divider />

              <Box w="full">
                <Text fontSize="sm" color="gray.500" textAlign="center" mb={3}>
                  Demo Accounts (for testing):
                </Text>
                <VStack spacing={2}>
                  <HStack spacing={2} wrap="wrap" justify="center">
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => handleDemoLogin('r1')}
                    >
                      SpeedServe (r1)
                    </Button>
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => handleDemoLogin('r2')}
                    >
                      OptiLine (r2)
                    </Button>
                  </HStack>
                  <HStack spacing={2} wrap="wrap" justify="center">
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => handleDemoLogin('r3')}
                    >
                      LowCostISP (r3)
                    </Button>
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => handleDemoLogin('r4')}
                    >
                      DownTownNet (r4)
                    </Button>
                  </HStack>
                </VStack>
              </Box>

              <Alert status="info" size="sm">
                <AlertIcon />
                <Box>
                  <Text fontSize="sm">
                    <strong>Access Code:</strong> Use your registered phone number
                  </Text>
                </Box>
              </Alert>

              <Text fontSize="xs" color="gray.400" textAlign="center">
                For ISP management, visit the{' '}
                <Button
                  variant="link"
                  size="xs"
                  onClick={() => router.push('/dashboard')}
                >
                  main dashboard
                </Button>
              </Text>
            </VStack>
          </CardBody>
        </Card>
      </Box>
    </Center>
  );
} 