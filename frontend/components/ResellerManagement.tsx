import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  useToast,
} from '@chakra-ui/react';

interface Reseller {
  id: string;
  name: string;
  plan_mbps: number;
  status: string;
}

const ResellerManagement: React.FC = () => {
  const [resellers, setResellers] = useState<Reseller[]>([]);
  const toast = useToast();
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    fetchResellers();
  }, []);

  const fetchResellers = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/resellers`);
      const data = await response.json();
      setResellers(data.resellers || []);
    } catch (error) {
      toast({ title: 'Error fetching resellers', status: 'error' });
    }
  };

  const handleAction = async (resellerId: string, action: string) => {
    try {
      await fetch(`${API_BASE}/api/resellers/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reseller_id: resellerId }),
      });
      toast({ title: `Action ${action} successful`, status: 'success' });
      fetchResellers();
    } catch (error) {
      toast({ title: `Error performing action ${action}`, status: 'error' });
    }
  };

  return (
    <Box>
      <Heading size="lg" mb={4}>Reseller Management</Heading>
      <Table>
        <Thead>
          <Tr>
            <Th>Name</Th>
            <Th>Plan (Mbps)</Th>
            <Th>Status</Th>
            <Th>Actions</Th>
          </Tr>
        </Thead>
        <Tbody>
          {resellers.map(reseller => (
            <Tr key={reseller.id}>
              <Td>{reseller.name}</Td>
              <Td>{reseller.plan_mbps}</Td>
              <Td><Badge colorScheme={reseller.status === 'active' ? 'green' : 'red'}>{reseller.status}</Badge></Td>
              <Td>
                <HStack>
                  <Button size="sm" colorScheme="yellow" onClick={() => handleAction(reseller.id, 'suspend')}>Suspend</Button>
                  <Button size="sm" colorScheme="green" onClick={() => handleAction(reseller.id, 'unsuspend')}>Unsuspend</Button>
                  <Button size="sm" colorScheme="red" onClick={() => handleAction(reseller.id, 'reboot')}>Reboot</Button>
                </HStack>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
};

export default ResellerManagement;