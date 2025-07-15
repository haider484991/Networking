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
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  useDisclosure,
} from '@chakra-ui/react';
import { AddIcon } from '@chakra-ui/icons';

interface Subnet {
  id: string;
  subnet: string;
  description: string;
}

interface Allocation {
  id: string;
  subnet_id: string;
  reseller_id: string;
  ip_address: string;
}

const IPAMManagement: React.FC = () => {
  const [subnets, setSubnets] = useState<Subnet[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [newSubnet, setNewSubnet] = useState({ subnet: '', description: '' });
  const toast = useToast();
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    fetchSubnets();
    fetchAllocations();
  }, []);

  const fetchSubnets = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/ipam/subnets`);
      const data = await response.json();
      setSubnets(data.subnets || []);
    } catch (error) {
      toast({ title: 'Error fetching subnets', status: 'error' });
    }
  };

  const fetchAllocations = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/ipam/allocations`);
      const data = await response.json();
      setAllocations(data.allocations || []);
    } catch (error) {
      toast({ title: 'Error fetching allocations', status: 'error' });
    }
  };

  const handleAddSubnet = async () => {
    try {
      await fetch(`${API_BASE}/api/ipam/subnets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSubnet),
      });
      fetchSubnets();
      onClose();
    } catch (error) {
      toast({ title: 'Error adding subnet', status: 'error' });
    }
  };

  return (
    <Box>
      <VStack spacing={4} align="stretch">
        <HStack justify="space-between">
          <Heading size="lg">IPAM</Heading>
          <Button leftIcon={<AddIcon />} colorScheme="blue" onClick={onOpen}>Add Subnet</Button>
        </HStack>

        <Heading size="md">Subnets</Heading>
        <Table>
          <Thead>
            <Tr>
              <Th>Subnet</Th>
              <Th>Description</Th>
            </Tr>
          </Thead>
          <Tbody>
            {subnets.map(subnet => (
              <Tr key={subnet.id}>
                <Td>{subnet.subnet}</Td>
                <Td>{subnet.description}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>

        <Heading size="md">Allocations</Heading>
        <Table>
          <Thead>
            <Tr>
              <Th>IP Address</Th>
              <Th>Reseller ID</Th>
              <Th>Subnet</Th>
            </Tr>
          </Thead>
          <Tbody>
            {allocations.map(alloc => (
              <Tr key={alloc.id}>
                <Td>{alloc.ip_address}</Td>
                <Td>{alloc.reseller_id}</Td>
                <Td>{subnets.find(s => s.id === alloc.subnet_id)?.subnet}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </VStack>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add Subnet</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl>
              <FormLabel>Subnet (CIDR)</FormLabel>
              <Input value={newSubnet.subnet} onChange={(e) => setNewSubnet({ ...newSubnet, subnet: e.target.value })} />
            </FormControl>
            <FormControl mt={4}>
              <FormLabel>Description</FormLabel>
              <Input value={newSubnet.description} onChange={(e) => setNewSubnet({ ...newSubnet, description: e.target.value })} />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>Cancel</Button>
            <Button colorScheme="blue" onClick={handleAddSubnet}>Add</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default IPAMManagement;