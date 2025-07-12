import { useRouter } from 'next/router';
import {
  Box,
  Button,
  Center,
  Heading,
  Text,
  VStack,
  HStack,
  Card,
  CardBody,
  Badge,
  Divider,
  Grid,
  GridItem,
} from '@chakra-ui/react';

export default function Home() {
  const router = useRouter();

  return (
    <Center minH="100vh" bg="gray.50">
      <Box maxW="4xl" w="full" p={8}>
        <VStack spacing={8}>
          {/* Header */}
          <VStack spacing={4} textAlign="center">
            <Heading as="h1" size="2xl" color="blue.600">
              ISP Reseller Monitoring System
            </Heading>
            <Text fontSize="xl" color="gray.600">
              Comprehensive bandwidth monitoring and management platform
            </Text>
            <Badge colorScheme="green" p={2} fontSize="sm">
              Multi-tenant • Real-time • Scalable
            </Badge>
          </VStack>

          {/* Main Navigation Cards */}
          <Grid templateColumns="repeat(auto-fit, minmax(300px, 1fr))" gap={6} w="full">
            <GridItem>
              <Card h="full" _hover={{ shadow: 'lg', transform: 'translateY(-2px)' }} transition="all 0.2s">
                <CardBody>
                  <VStack spacing={4} align="stretch">
                    <Heading size="md" color="blue.600">
                      ISP Dashboard
                    </Heading>
                    <Text color="gray.600">
                      Comprehensive management interface for ISP owners to monitor all resellers, 
                      manage accounts, generate reports, and configure alerts.
                    </Text>
                    <VStack spacing={2} align="start" fontSize="sm">
                      <Text>✓ Real-time reseller monitoring</Text>
                      <Text>✓ Bandwidth usage charts</Text>
                      <Text>✓ Alert management</Text>
                      <Text>✓ PDF report generation</Text>
                      <Text>✓ Reseller CRUD operations</Text>
                    </VStack>
                    <Button 
                      colorScheme="blue" 
                      size="lg" 
                      onClick={() => router.push('/dashboard')}
                    >
                      Access ISP Dashboard
                    </Button>
                  </VStack>
                </CardBody>
              </Card>
            </GridItem>

            <GridItem>
              <Card h="full" _hover={{ shadow: 'lg', transform: 'translateY(-2px)' }} transition="all 0.2s">
                <CardBody>
                  <VStack spacing={4} align="stretch">
                    <Heading size="md" color="green.600">
                      Reseller Portal
                    </Heading>
                    <Text color="gray.600">
                      Dedicated login portal for individual resellers to access their own 
                      bandwidth usage data, alerts, and performance metrics.
                    </Text>
                    <VStack spacing={2} align="start" fontSize="sm">
                      <Text>✓ Personal usage dashboard</Text>
                      <Text>✓ 24-hour bandwidth charts</Text>
                      <Text>✓ Alert notifications</Text>
                      <Text>✓ Utilization statistics</Text>
                      <Text>✓ Secure access control</Text>
                    </VStack>
                    <Button 
                      colorScheme="green" 
                      size="lg" 
                      onClick={() => router.push('/reseller-login')}
                    >
                      Reseller Login
                    </Button>
                  </VStack>
                </CardBody>
              </Card>
            </GridItem>
          </Grid>

          <Divider />

          {/* System Features */}
          <Box w="full">
            <Heading size="lg" textAlign="center" mb={6} color="gray.700">
              System Features
            </Heading>
            <Grid templateColumns="repeat(auto-fit, minmax(250px, 1fr))" gap={4}>
              <Card>
                <CardBody>
                  <VStack spacing={3}>
                    <Heading size="sm" color="blue.600">Real-time Monitoring</Heading>
                    <Text fontSize="sm" textAlign="center">
                      5-minute interval bandwidth monitoring with live updates
                    </Text>
                  </VStack>
                </CardBody>
              </Card>

              <Card>
                <CardBody>
                  <VStack spacing={3}>
                    <Heading size="sm" color="yellow.600">Threshold Alerts</Heading>
                    <Text fontSize="sm" textAlign="center">
                      80% yellow alerts, 100% red alerts via WhatsApp/SMS
                    </Text>
                  </VStack>
                </CardBody>
              </Card>

              <Card>
                <CardBody>
                  <VStack spacing={3}>
                    <Heading size="sm" color="red.600">Link Monitoring</Heading>
                    <Text fontSize="sm" textAlign="center">
                      Continuous ping monitoring with 3-failure threshold
                    </Text>
                  </VStack>
                </CardBody>
              </Card>

              <Card>
                <CardBody>
                  <VStack spacing={3}>
                    <Heading size="sm" color="purple.600">PDF Reports</Heading>
                    <Text fontSize="sm" textAlign="center">
                      Auto-generated monthly reports with graphs and statistics
                    </Text>
                  </VStack>
                </CardBody>
              </Card>
            </Grid>
          </Box>

          {/* Footer */}
          <VStack spacing={2} textAlign="center">
            <Text fontSize="sm" color="gray.500">
              Built with Next.js, FastAPI, Supabase, and Docker
            </Text>
            <HStack spacing={4}>
              <Button size="sm" variant="link" onClick={() => router.push('/dashboard')}>
                Demo ISP Dashboard
              </Button>
              <Button size="sm" variant="link" onClick={() => router.push('/reseller-login')}>
                Demo Reseller Portal
              </Button>
            </HStack>
          </VStack>
        </VStack>
      </Box>
    </Center>
  );
} 