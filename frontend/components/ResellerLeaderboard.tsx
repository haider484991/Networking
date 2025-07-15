import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Badge,
  Text,
  VStack,
  HStack,
  Progress,
  Avatar,
  Flex,
  Alert,
  AlertIcon,
  Spinner,
  Center,
  useToast,
  Button,
  useColorModeValue,
} from '@chakra-ui/react';
import { apiClient, Reseller } from '../utils/api';

interface LeaderboardEntry {
  reseller: Reseller;
  currentUsage: number;
  utilization: number;
  rank: number;
}

export default function ResellerLeaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  // Color mode values for glass morphism
  const glassBg = useColorModeValue('rgba(255, 255, 255, 0.75)', 'rgba(26, 32, 44, 0.75)');

  useEffect(() => {
    console.log('ResellerLeaderboard component mounted, loading data...');
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Loading leaderboard data...');
      const resellers = await apiClient.getResellers();
      console.log('Fetched resellers:', resellers);
      
      if (resellers.length === 0) {
        console.log('No resellers found');
        setLeaderboard([]);
        setLoading(false);
        return;
      }
      
      // Get current usage for each reseller
      const leaderboardData = await Promise.all(
        resellers.map(async (reseller) => {
          try {
            console.log(`Fetching usage for reseller ${reseller.id}...`);
            const usage = await apiClient.getResellerUsage(reseller.id, 1);
            console.log(`Usage data for ${reseller.id}:`, usage);
            
            const currentUsage = usage.length > 0 
              ? usage[usage.length - 1].rx_mbps + usage[usage.length - 1].tx_mbps
              : 0;
            const utilization = (currentUsage / reseller.plan_mbps) * 100;
            
            console.log(`Calculated usage for ${reseller.id}: ${currentUsage} Mbps (${utilization.toFixed(1)}%)`);
            
            return {
              reseller,
              currentUsage,
              utilization,
              rank: 0, // Will be set after sorting
            };
          } catch (error) {
            console.error(`Error fetching usage for ${reseller.id}:`, error);
            return {
              reseller,
              currentUsage: 0,
              utilization: 0,
              rank: 0,
            };
          }
        })
      );

      // Sort by current usage (descending) and assign ranks
      const sortedData = leaderboardData
        .sort((a, b) => b.currentUsage - a.currentUsage)
        .map((entry, index) => ({
          ...entry,
          rank: index + 1,
        }));

      console.log('Final leaderboard data:', sortedData);
      setLeaderboard(sortedData);
      
      toast({
        title: 'Leaderboard updated',
        description: `Loaded ${sortedData.length} resellers`,
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
      
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
      
      toast({
        title: 'Error loading leaderboard',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Badge colorScheme="yellow">🥇 #1</Badge>;
    if (rank === 2) return <Badge colorScheme="gray">🥈 #2</Badge>;
    if (rank === 3) return <Badge colorScheme="orange">🥉 #3</Badge>;
    return <Badge colorScheme="blue">#{rank}</Badge>;
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 90) return 'red';
    if (utilization >= 70) return 'yellow';
    if (utilization >= 50) return 'blue';
    return 'green';
  };

  if (loading) {
    return null; // Make loading invisible
  }

  if (error) {
    return (
      <Card bg={glassBg} backdropFilter="blur(10px)" borderRadius="xl" shadow="lg">
        <CardHeader>
          <Heading size="md">Top Resellers by Usage</Heading>
        </CardHeader>
        <CardBody>
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            <VStack align="start" spacing={2}>
              <Text fontWeight="bold">Failed to load leaderboard</Text>
              <Text fontSize="sm">{error}</Text>
            </VStack>
          </Alert>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card bg={glassBg} backdropFilter="blur(10px)" borderRadius="xl" shadow="lg">
      <CardHeader>
        <Flex justify="space-between" align="center">
          <Box>
            <Heading size="md">Top Resellers by Usage</Heading>
            <Text fontSize="sm" color="gray.600">
              Ranked by current bandwidth consumption
            </Text>
          </Box>
          <Button size="sm" onClick={loadLeaderboard} isLoading={loading} colorScheme="blue">
            Refresh
          </Button>
        </Flex>
      </CardHeader>
      <CardBody>
        {leaderboard.length === 0 ? (
          <Center py={8}>
            <VStack spacing={4}>
              <Text color="gray.500">No resellers found</Text>
              <Button size="sm" onClick={loadLeaderboard} isLoading={loading} colorScheme="blue">
                Try Again
              </Button>
            </VStack>
          </Center>
        ) : (
          <Table variant="simple" size="sm">
            <Thead>
              <Tr>
                <Th>Rank</Th>
                <Th>Reseller</Th>
                <Th>Current Usage</Th>
                <Th>Plan</Th>
                <Th>Utilization</Th>
              </Tr>
            </Thead>
            <Tbody>
              {leaderboard.map((entry) => (
                <Tr key={entry.reseller.id}>
                  <Td>
                    {getRankBadge(entry.rank)}
                  </Td>
                  <Td>
                    <HStack spacing={3}>
                      <Avatar 
                        name={entry.reseller.name} 
                        size="sm" 
                        bg={`${getUtilizationColor(entry.utilization)}.400`}
                      />
                      <VStack align="start" spacing={0}>
                        <Text fontWeight="bold" fontSize="sm">
                          {entry.reseller.name}
                        </Text>
                        <Text fontSize="xs" color="gray.500">
                          {entry.reseller.id}
                        </Text>
                      </VStack>
                    </HStack>
                  </Td>
                  <Td>
                    <Text fontWeight="bold">
                      {entry.currentUsage.toFixed(1)} Mbps
                    </Text>
                  </Td>
                  <Td>
                    <Text>{entry.reseller.plan_mbps} Mbps</Text>
                  </Td>
                  <Td>
                    <VStack align="start" spacing={1}>
                      <Progress
                        value={Math.min(entry.utilization, 100)}
                        colorScheme={getUtilizationColor(entry.utilization)}
                        size="sm"
                        w="80px"
                      />
                      <Text fontSize="xs" color="gray.600">
                        {entry.utilization.toFixed(1)}%
                      </Text>
                    </VStack>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </CardBody>
    </Card>
  );
} 