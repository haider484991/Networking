import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Heading,
  IconButton,
  Spinner,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  useToast,
} from '@chakra-ui/react';
import { RepeatIcon } from '@chakra-ui/icons';
import { apiClient, VLAN } from '../utils/api';

interface VLANManagementProps {
  routerId: string;
  routerName?: string;
}

export default function VLANManagement({ routerId, routerName }: VLANManagementProps) {
  const [vlans, setVlans] = useState<VLAN[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const toast = useToast();

  const fetchVlans = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getRouterVLANs(routerId);
      setVlans(data);
    } catch (err) {
      console.error(err);
      toast({
        title: 'Failed to load VLANs',
        description: err instanceof Error ? err.message : 'Unknown error',
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchVlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routerId]);

  const handleSync = async () => {
    try {
      setLoading(true);
      const synced = await apiClient.syncRouterVLANs(routerId);
      setVlans(synced);
      toast({
        title: 'VLANs synced',
        description: `Fetched ${synced.length} VLAN interfaces from router`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      console.error(err);
      toast({
        title: 'Sync failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box borderWidth="1px" borderRadius="lg" p={4} mb={6}>
      <Heading as="h3" size="md" mb={4}>
        VLAN Interfaces {routerName ? `– ${routerName}` : ''}
      </Heading>
      <Button
        leftIcon={<RepeatIcon />}
        colorScheme="blue"
        size="sm"
        mb={4}
        onClick={handleSync}
        isLoading={loading}
      >
        Sync from Router
      </Button>
      {loading ? (
        <Spinner />
      ) : (
        <Table size="sm" variant="simple">
          <Thead>
            <Tr>
              <Th>ID</Th>
              <Th>Interface Name</Th>
              <Th>Capacity (Mbps)</Th>
              <Th>Enabled</Th>
              <Th>Description</Th>
            </Tr>
          </Thead>
          <Tbody>
            {vlans.length === 0 ? (
              <Tr>
                <Td colSpan={5} textAlign="center">
                  No VLAN interfaces found.
                </Td>
              </Tr>
            ) : (
              vlans.map((vlan) => (
                <Tr key={vlan.vlan_id}>
                  <Td>{vlan.vlan_id}</Td>
                  <Td>{vlan.interface_name || '-'}</Td>
                  <Td>{vlan.capacity_mbps}</Td>
                  <Td>{vlan.enabled ? 'Yes' : 'No'}</Td>
                  <Td>{vlan.description || '-'}</Td>
                </Tr>
              ))
            )}
          </Tbody>
        </Table>
      )}
    </Box>
  );
}
