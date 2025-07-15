import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  Button,
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
  Select,
  VStack,
  HStack,
  Badge,
  Spinner,
  Alert,
  AlertIcon,
  AlertDescription,
  useDisclosure,
  Grid,
  GridItem,
  Card,
  CardBody,
  IconButton,
  Divider,
  useColorModeValue
} from '@chakra-ui/react';
import { AddIcon, EditIcon, DeleteIcon, LinkIcon } from '@chakra-ui/icons';

interface Reseller {
  id: string;
  name: string;
  plan_mbps: number;
  created_at: string;
  updated_at: string;
}

interface Router {
  id: string;
  name: string;
  host: string;
  enabled: boolean;
}

interface RouterMapping {
  id: number;
  reseller_id: string;
  router_id: string;
  target_ip: string;
  queue_name: string;
  created_at: string;
  resellers?: Reseller;
  router_configs?: Router;
}

interface ResellerFormData {
  id: string;
  name: string;
  plan_mbps: number;
}

interface MappingFormData {
  reseller_id: string;
  router_id: string;
  target_ip: string;
  queue_name: string;
}

interface ResellerManagementProps {
  onAlert: (message: string, type: 'success' | 'error') => void;
}

const ResellerManagement: React.FC<ResellerManagementProps> = ({ onAlert }) => {
  const [resellers, setResellers] = useState<Reseller[]>([]);
  const [routers, setRouters] = useState<Router[]>([]);
  const [mappings, setMappings] = useState<RouterMapping[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { isOpen: isResellerModalOpen, onOpen: onResellerModalOpen, onClose: onResellerModalClose } = useDisclosure();
  const { isOpen: isMappingModalOpen, onOpen: onMappingModalOpen, onClose: onMappingModalClose } = useDisclosure();
  const [editingReseller, setEditingReseller] = useState<Reseller | null>(null);
  
  const [resellerForm, setResellerForm] = useState<ResellerFormData>({
    id: '',
    name: '',
    plan_mbps: 100
  });
  
  const [mappingForm, setMappingForm] = useState<MappingFormData>({
    reseller_id: '',
    router_id: '',
    target_ip: '',
    queue_name: ''
  });

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [resellersRes, routersRes, mappingsRes] = await Promise.all([
        fetch(`${API_BASE}/resellers`),
        fetch(`${API_BASE}/api/routers`),
        fetch(`${API_BASE}/api/router-mappings`)
      ]);

      const resellersData = await resellersRes.json();
      const routersData = await routersRes.json();
      const mappingsData = await mappingsRes.json();

      setResellers(resellersData.resellers || []);
      setRouters(routersData.routers || []);
      setMappings(mappingsData.mappings || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      onAlert('Failed to fetch data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResellerSubmit = async () => {
    try {
      const url = editingReseller 
        ? `${API_BASE}/resellers/${editingReseller.id}`
        : `${API_BASE}/resellers`;
      
      const method = editingReseller ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resellerForm)
      });

      const result = await response.json();

      if (response.ok) {
        onAlert(
          editingReseller ? 'Reseller updated successfully' : 'Reseller created successfully',
          'success'
        );
        onResellerModalClose();
        setEditingReseller(null);
        resetResellerForm();
        fetchData();
      } else {
        onAlert(result.detail || 'Operation failed', 'error');
      }
    } catch (error) {
      console.error('Error saving reseller:', error);
      onAlert('Failed to save reseller', 'error');
    }
  };

  const handleMappingSubmit = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/router-mappings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mappingForm)
      });

      const result = await response.json();

      if (response.ok) {
        onAlert('Router mapping created successfully', 'success');
        onMappingModalClose();
        resetMappingForm();
        fetchData();
      } else {
        onAlert(result.detail || 'Failed to create mapping', 'error');
      }
    } catch (error) {
      console.error('Error creating mapping:', error);
      onAlert('Failed to create mapping', 'error');
    }
  };

  const handleDeleteReseller = async (resellerId: string) => {
    if (!confirm('Are you sure you want to delete this reseller? This will also remove all router mappings.')) return;

    try {
      const response = await fetch(`${API_BASE}/resellers/${resellerId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        onAlert('Reseller deleted successfully', 'success');
        fetchData();
      } else {
        const result = await response.json();
        onAlert(result.detail || 'Failed to delete reseller', 'error');
      }
    } catch (error) {
      console.error('Error deleting reseller:', error);
      onAlert('Failed to delete reseller', 'error');
    }
  };

  const handleDeleteMapping = async (mappingId: number) => {
    if (!confirm('Are you sure you want to delete this router mapping?')) return;

    try {
      const response = await fetch(`${API_BASE}/api/router-mappings/${mappingId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        onAlert('Router mapping deleted successfully', 'success');
        fetchData();
      } else {
        const result = await response.json();
        onAlert(result.detail || 'Failed to delete mapping', 'error');
      }
    } catch (error) {
      console.error('Error deleting mapping:', error);
      onAlert('Failed to delete mapping', 'error');
    }
  };

  const resetResellerForm = () => {
    setResellerForm({
      id: '',
      name: '',
      plan_mbps: 100
    });
  };

  const resetMappingForm = () => {
    setMappingForm({
      reseller_id: '',
      router_id: '',
      target_ip: '',
      queue_name: ''
    });
  };

  const openResellerModal = (reseller?: Reseller) => {
    if (reseller) {
      setEditingReseller(reseller);
      setResellerForm({
        id: reseller.id,
        name: reseller.name,
        plan_mbps: reseller.plan_mbps
      });
    } else {
      setEditingReseller(null);
      resetResellerForm();
    }
    onResellerModalOpen();
  };

  const openMappingModal = (resellerId?: string) => {
    resetMappingForm();
    if (resellerId) {
      setMappingForm(prev => ({ ...prev, reseller_id: resellerId }));
    }
    onMappingModalOpen();
  };

  const getResellerMappings = (resellerId: string) => {
    return mappings.filter(mapping => mapping.reseller_id === resellerId);
  };

  if (loading) {
    return (
      <Box textAlign="center" py={8}>
        <Spinner size="xl" color="blue.500" />
        <Text mt={4} color="gray.600">Loading resellers...</Text>
      </Box>
    );
  }

  return (
    <Container maxW="container.xl" p={0}>
      <Box p={4}>
        <HStack justifyContent="space-between" alignItems="center" mb={4}>
          <VStack alignItems="flex-start">
            <Heading size="lg">Reseller Management</Heading>
            <Text fontSize="md" color="gray.600">Manage resellers and their router assignments</Text>
          </VStack>
          <HStack spacing={3}>
            <Button
              leftIcon={<LinkIcon />}
              colorScheme="green"
            onClick={() => openMappingModal()}
            >
              Add Mapping
            </Button>
            <Button
              leftIcon={<AddIcon />}
              colorScheme="blue"
            onClick={() => openResellerModal()}
            >
              Add Reseller
            </Button>
          </HStack>
        </HStack>

        <Grid templateColumns={{ base: '1fr', lg: 'repeat(2, 1fr)' }} gap={6} mb={6}>
        {/* Resellers */}
          <GridItem>
            <Card bg={cardBg} boxShadow="md">
              <CardBody>
                <Heading size="md" mb={2}>Resellers ({resellers.length})</Heading>
                <Divider mb={2} />
                <VStack align="stretch" spacing={2} maxH="96" overflowY="auto">
            {resellers.map((reseller) => {
              const resellerMappings = getResellerMappings(reseller.id);
              return (
                      <Box key={reseller.id} p={2} borderRadius="md" bg="gray.50">
                        <HStack justifyContent="space-between" alignItems="center">
                          <VStack align="stretch" spacing={1}>
                            <HStack>
                              <Badge colorScheme="blue">{reseller.plan_mbps} Mbps</Badge>
                              <Text fontSize="sm" fontWeight="medium" color="gray.900">
                                {reseller.name}
                              </Text>
                            </HStack>
                            <Text fontSize="xs" color="gray.500">ID: {reseller.id}</Text>
                            <Text fontSize="xs" color="gray.500">
                        {resellerMappings.length} router{resellerMappings.length !== 1 ? 's' : ''} assigned
                            </Text>
                      {resellerMappings.length > 0 && (
                              <VStack align="stretch" spacing={1} mt={1}>
                          {resellerMappings.map((mapping) => (
                                  <Box key={mapping.id} p={1} borderRadius="sm" bg="gray.100" fontSize="xs" color="gray.600">
                              {mapping.router_configs?.name} → {mapping.target_ip}
                                  </Box>
                          ))}
                              </VStack>
                      )}
                          </VStack>
                          <HStack spacing={1}>
                            <IconButton
                              aria-label="Add Router Mapping"
                              icon={<LinkIcon />}
                              colorScheme="green"
                              size="sm"
                        onClick={() => openMappingModal(reseller.id)}
                            />
                            <IconButton
                              aria-label="Edit Reseller"
                              icon={<EditIcon />}
                              colorScheme="yellow"
                              size="sm"
                        onClick={() => openResellerModal(reseller)}
                            />
                            <IconButton
                              aria-label="Delete Reseller"
                              icon={<DeleteIcon />}
                              colorScheme="red"
                              size="sm"
                        onClick={() => handleDeleteReseller(reseller.id)}
                            />
                          </HStack>
                        </HStack>
                      </Box>
              );
            })}
            {resellers.length === 0 && (
                    <Box textAlign="center" py={8} color="gray.500">
                No resellers found. Add your first reseller to get started.
                    </Box>
            )}
                </VStack>
              </CardBody>
            </Card>
          </GridItem>

        {/* Router Mappings */}
          <GridItem>
            <Card bg={cardBg} boxShadow="md">
              <CardBody>
                <Heading size="md" mb={2}>Router Mappings ({mappings.length})</Heading>
                <Divider mb={2} />
                <VStack align="stretch" spacing={2} maxH="96" overflowY="auto">
            {mappings.map((mapping) => (
                    <Box key={mapping.id} p={2} borderRadius="md" bg="gray.50">
                      <HStack justifyContent="space-between" alignItems="center">
                        <VStack align="stretch" spacing={1}>
                          <HStack>
                            <Badge colorScheme="blue">
                        {mapping.resellers?.name || mapping.reseller_id}
                            </Badge>
                            <Text fontSize="sm" color="gray.400">→</Text>
                            <Text fontSize="sm" fontWeight="medium" color="gray.600">
                        {mapping.router_configs?.name || mapping.router_id}
                            </Text>
                          </HStack>
                          <Text fontSize="sm" color="gray.500">IP: {mapping.target_ip}</Text>
                          <Text fontSize="sm" color="gray.500">Queue: {mapping.queue_name}</Text>
                          <Text fontSize="xs" color="gray.400">
                      Router: {mapping.router_configs?.host}
                          </Text>
                        </VStack>
                        <IconButton
                          aria-label="Delete Mapping"
                          icon={<DeleteIcon />}
                          colorScheme="red"
                          size="sm"
                    onClick={() => handleDeleteMapping(mapping.id)}
                        />
                      </HStack>
                    </Box>
            ))}
            {mappings.length === 0 && (
                    <Box textAlign="center" py={8} color="gray.500">
                No router mappings found. Create mappings to assign resellers to routers.
                    </Box>
            )}
                </VStack>
              </CardBody>
            </Card>
          </GridItem>
        </Grid>

      {/* Summary Stats */}
        <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={4} mt={6}>
          <GridItem>
            <Card bg={cardBg} boxShadow="md">
              <CardBody textAlign="center">
                <HStack>
                  <Box fontSize="2xl">👥</Box>
                  <VStack align="stretch" spacing={0}>
                    <Text fontSize="sm" color="gray.600">Total Resellers</Text>
                    <Text fontSize="2xl" fontWeight="bold" color="gray.900">
                      {resellers.length}
                    </Text>
                  </VStack>
                </HStack>
              </CardBody>
            </Card>
          </GridItem>

          <GridItem>
            <Card bg={cardBg} boxShadow="md">
              <CardBody textAlign="center">
                <HStack>
                  <Box fontSize="2xl">🔗</Box>
                  <VStack align="stretch" spacing={0}>
                    <Text fontSize="sm" color="gray.600">Router Mappings</Text>
                    <Text fontSize="2xl" color="blue.600" fontWeight="bold">
                      {mappings.length}
                    </Text>
                  </VStack>
                </HStack>
              </CardBody>
            </Card>
          </GridItem>

          <GridItem>
            <Card bg={cardBg} boxShadow="md">
              <CardBody textAlign="center">
                <HStack>
                  <Box fontSize="2xl">📊</Box>
                  <VStack align="stretch" spacing={0}>
                    <Text fontSize="sm" color="gray.600">Total Bandwidth</Text>
                    <Text fontSize="2xl" color="green.600" fontWeight="bold">
                {resellers.reduce((sum, r) => sum + r.plan_mbps, 0)} Mbps
                    </Text>
                  </VStack>
                </HStack>
              </CardBody>
            </Card>
          </GridItem>
        </Grid>
      </Box>

      {/* Add/Edit Reseller Modal */}
      <Modal isOpen={isResellerModalOpen} onClose={onResellerModalClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
              {editingReseller ? 'Edit Reseller' : 'Add New Reseller'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Reseller ID</FormLabel>
                <Input
                  type="text"
                  value={resellerForm.id}
                  onChange={(e) => setResellerForm({...resellerForm, id: e.target.value})}
                  isDisabled={!!editingReseller}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Name</FormLabel>
                <Input
                  type="text"
                  value={resellerForm.name}
                  onChange={(e) => setResellerForm({...resellerForm, name: e.target.value})}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Bandwidth Plan (Mbps)</FormLabel>
                <Input
                  type="number"
                  min="1"
                  value={resellerForm.plan_mbps}
                  onChange={(e) => setResellerForm({...resellerForm, plan_mbps: parseInt(e.target.value)})}
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={onResellerModalClose}>Cancel</Button>
            <Button colorScheme="blue" onClick={handleResellerSubmit}>
                  {editingReseller ? 'Update' : 'Create'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Add Router Mapping Modal */}
      <Modal isOpen={isMappingModalOpen} onClose={onMappingModalClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add Router Mapping</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Reseller</FormLabel>
                <Select
                  value={mappingForm.reseller_id}
                  onChange={(e) => setMappingForm({...mappingForm, reseller_id: e.target.value})}
                >
                  <option value="">Select Reseller</option>
                  {resellers.map((reseller) => (
                    <option key={reseller.id} value={reseller.id}>
                      {reseller.name} ({reseller.id})
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Router</FormLabel>
                <Select
                  value={mappingForm.router_id}
                  onChange={(e) => setMappingForm({...mappingForm, router_id: e.target.value})}
                >
                  <option value="">Select Router</option>
                  {routers.filter(r => r.enabled).map((router) => (
                    <option key={router.id} value={router.id}>
                      {router.name} ({router.host})
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Target IP Address</FormLabel>
                <Input
                  type="text"
                  value={mappingForm.target_ip}
                  onChange={(e) => setMappingForm({...mappingForm, target_ip: e.target.value})}
                  placeholder="192.168.1.100"
                />
              </FormControl>

              <FormControl>
                <FormLabel>Queue Name (Optional)</FormLabel>
                <Input
                  type="text"
                  value={mappingForm.queue_name}
                  onChange={(e) => setMappingForm({...mappingForm, queue_name: e.target.value})}
                  placeholder="Auto-generated if empty"
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={onMappingModalClose}>Cancel</Button>
            <Button colorScheme="green" onClick={handleMappingSubmit}>
                  Create Mapping
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  );
};

export default ResellerManagement; 