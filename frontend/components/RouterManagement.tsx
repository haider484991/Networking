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
  IconButton,
  Card,
  CardBody,
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
  Switch,
  useDisclosure,
  useToast,
  Spinner,
  Center,
  Grid,
  GridItem,
  useColorModeValue,
  Container,
  Divider
} from '@chakra-ui/react';
import { AddIcon, EditIcon, DeleteIcon, SettingsIcon } from '@chakra-ui/icons';

interface Router {
  id: string;
  name: string;
  host: string;
  username: string;
  password: string;
  port: number;
  use_ssl: boolean;
  device_type: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface RouterFormData {
  id: string;
  name: string;
  host: string;
  username: string;
  password: string;
  port: number;
  use_ssl: boolean;
  device_type: string;
  enabled: boolean;
}

interface RouterManagementProps {
  onAlert: (message: string, type: 'success' | 'error') => void;
}

const RouterManagement: React.FC<RouterManagementProps> = ({ onAlert }) => {
  const [routers, setRouters] = useState<Router[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingConnection, setTestingConnection] = useState<string | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [editingRouter, setEditingRouter] = useState<Router | null>(null);
  const [formData, setFormData] = useState<RouterFormData>({
    id: '',
    name: '',
    host: '',
    username: '',
    password: '',
    port: 8728,
    use_ssl: false,
    device_type: 'mikrotik',
    enabled: true
  });

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const toast = useToast();

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    fetchRouters();
  }, []);

  const fetchRouters = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/routers`);
      const data = await response.json();
      setRouters(data.routers || []);
    } catch (error) {
      console.error('Error fetching routers:', error);
      onAlert('Failed to fetch routers', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingRouter 
        ? `${API_BASE}/api/routers/${editingRouter.id}`
        : `${API_BASE}/api/routers`;
      
      const method = editingRouter ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: editingRouter ? 'Router updated successfully' : 'Router created successfully',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        onClose();
        setEditingRouter(null);
        resetForm();
        fetchRouters();
      } else {
        toast({
          title: 'Error',
          description: result.detail || 'Operation failed',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error saving router:', error);
      toast({
        title: 'Error',
        description: 'Failed to save router',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleDelete = async (routerId: string) => {
    if (!confirm('Are you sure you want to delete this router?')) return;

    try {
      const response = await fetch(`${API_BASE}/api/routers/${routerId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast({
          title: 'Router deleted successfully',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        fetchRouters();
      } else {
        const result = await response.json();
        toast({
          title: 'Error',
          description: result.detail || 'Failed to delete router',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error deleting router:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete router',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const testConnection = async (routerId: string) => {
    setTestingConnection(routerId);
    try {
      const response = await fetch(`${API_BASE}/api/routers/${routerId}/test-connection`);
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: 'Connection successful!',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        toast({
          title: 'Connection failed',
          description: result.message,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      toast({
        title: 'Error',
        description: 'Failed to test connection',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setTestingConnection(null);
    }
  };

  const resetForm = () => {
    setFormData({
      id: '',
      name: '',
      host: '',
      username: '',
      password: '',
      port: 8728,
      use_ssl: false,
      device_type: 'mikrotik',
      enabled: true
    });
  };

  const openEditModal = (router: Router) => {
    setEditingRouter(router);
    setFormData({
      id: router.id,
      name: router.name,
      host: router.host,
      username: router.username,
      password: router.password,
      port: router.port,
      use_ssl: router.use_ssl,
      device_type: router.device_type,
      enabled: router.enabled
    });
    onOpen();
  };

  const openAddModal = () => {
    setEditingRouter(null);
    resetForm();
    onOpen();
  };

  if (loading) {
    return (
      <Center h="200px">
        <VStack spacing={4}>
          <Spinner size="xl" color="blue.500" thickness="4px" />
          <Text color="gray.500" fontSize="lg">Loading routers...</Text>
        </VStack>
      </Center>
    );
  }

  return (
    <Container maxW="container.xl" p={0}>
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <HStack justify="space-between" align="center">
          <VStack align="flex-start" spacing={1}>
            <Heading size="lg" color="gray.900">Router Management</Heading>
            <Text color="gray.600">Configure and manage MikroTik router connections</Text>
          </VStack>
          <Button
            leftIcon={<AddIcon />}
            colorScheme="blue"
            onClick={openAddModal}
            size="md"
          >
            Add Router
          </Button>
        </HStack>

        {/* Routers Table */}
        <Card bg={cardBg} boxShadow="lg" borderRadius="xl">
          <CardBody p={0}>
            {routers.length === 0 ? (
              <Center py={12}>
                <VStack spacing={4}>
                  <Text color="gray.500" fontSize="lg">No routers configured</Text>
                  <Text color="gray.400" fontSize="sm">Add your first router to get started</Text>
                  <Button leftIcon={<AddIcon />} colorScheme="blue" onClick={openAddModal}>
                    Add Your First Router
                  </Button>
                </VStack>
              </Center>
            ) : (
              <Table variant="simple">
                <Thead bg={useColorModeValue('gray.50', 'gray.700')}>
                  <Tr>
                    <Th color="gray.600" fontSize="xs" fontWeight="semibold" textTransform="uppercase" letterSpacing="wider">
                      Router Details
                    </Th>
                    <Th color="gray.600" fontSize="xs" fontWeight="semibold" textTransform="uppercase" letterSpacing="wider">
                      Connection
                    </Th>
                    <Th color="gray.600" fontSize="xs" fontWeight="semibold" textTransform="uppercase" letterSpacing="wider">
                      Status
                    </Th>
                    <Th color="gray.600" fontSize="xs" fontWeight="semibold" textTransform="uppercase" letterSpacing="wider">
                      Actions
                    </Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {routers.map((router) => (
                    <Tr key={router.id} _hover={{ bg: useColorModeValue('gray.50', 'gray.700') }}>
                      <Td py={4}>
                        <VStack align="flex-start" spacing={1}>
                          <Text fontWeight="semibold" color="gray.900">{router.name}</Text>
                          <Text fontSize="sm" color="gray.500">ID: {router.id}</Text>
                          <Badge colorScheme="blue" variant="subtle" size="sm">
                            {router.device_type}
                          </Badge>
                        </VStack>
                      </Td>
                      <Td py={4}>
                        <VStack align="flex-start" spacing={1}>
                          <Text fontWeight="medium" color="gray.900">
                            {router.host}:{router.port}
                          </Text>
                          <HStack spacing={2}>
                            <Badge colorScheme={router.use_ssl ? 'green' : 'orange'} variant="subtle">
                              {router.use_ssl ? '🔒 SSL' : '🔓 No SSL'}
                            </Badge>
                            <Text fontSize="sm" color="gray.500">
                              User: {router.username}
                            </Text>
                          </HStack>
                        </VStack>
                      </Td>
                      <Td py={4}>
                        <Badge
                          colorScheme={router.enabled ? 'green' : 'red'}
                          variant="solid"
                          borderRadius="full"
                          px={3}
                          py={1}
                        >
                          {router.enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </Td>
                      <Td py={4}>
                        <HStack spacing={2}>
                          <IconButton
                            aria-label="Test Connection"
                            icon={testingConnection === router.id ? <Spinner size="sm" /> : <SettingsIcon />}
                            colorScheme="blue"
                            variant="ghost"
                            size="sm"
                            onClick={() => testConnection(router.id)}
                            isDisabled={testingConnection === router.id}
                            title="Test Connection"
                          />
                          <IconButton
                            aria-label="Edit Router"
                            icon={<EditIcon />}
                            colorScheme="yellow"
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(router)}
                            title="Edit Router"
                          />
                          <IconButton
                            aria-label="Delete Router"
                            icon={<DeleteIcon />}
                            colorScheme="red"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(router.id)}
                            title="Delete Router"
                          />
                        </HStack>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </CardBody>
        </Card>

        {/* Add/Edit Modal */}
        <Modal isOpen={isOpen} onClose={onClose} size="lg">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>
              {editingRouter ? 'Edit Router' : 'Add New Router'}
            </ModalHeader>
            <ModalCloseButton />
            <form onSubmit={handleSubmit}>
              <ModalBody>
                <VStack spacing={4}>
                  <Grid templateColumns="repeat(2, 1fr)" gap={4} w="full">
                    <GridItem>
                      <FormControl isRequired>
                        <FormLabel>Router ID</FormLabel>
                        <Input
                          value={formData.id}
                          onChange={(e) => setFormData({...formData, id: e.target.value})}
                          placeholder="mikrotik_main"
                          isDisabled={!!editingRouter}
                        />
                      </FormControl>
                    </GridItem>

                    <GridItem>
                      <FormControl isRequired>
                        <FormLabel>Name</FormLabel>
                        <Input
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                          placeholder="Main MikroTik Router"
                        />
                      </FormControl>
                    </GridItem>
                  </Grid>

                  <Grid templateColumns="repeat(2, 1fr)" gap={4} w="full">
                    <GridItem>
                      <FormControl isRequired>
                        <FormLabel>Host/IP Address</FormLabel>
                        <Input
                          value={formData.host}
                          onChange={(e) => setFormData({...formData, host: e.target.value})}
                          placeholder="192.168.1.1"
                        />
                      </FormControl>
                    </GridItem>

                    <GridItem>
                      <FormControl isRequired>
                        <FormLabel>Port</FormLabel>
                        <Input
                          type="number"
                          value={formData.port}
                          onChange={(e) => setFormData({...formData, port: parseInt(e.target.value)})}
                          placeholder="8728"
                        />
                      </FormControl>
                    </GridItem>
                  </Grid>

                  <Grid templateColumns="repeat(2, 1fr)" gap={4} w="full">
                    <GridItem>
                      <FormControl isRequired>
                        <FormLabel>Username</FormLabel>
                        <Input
                          value={formData.username}
                          onChange={(e) => setFormData({...formData, username: e.target.value})}
                          placeholder="admin"
                        />
                      </FormControl>
                    </GridItem>

                    <GridItem>
                      <FormControl isRequired>
                        <FormLabel>Password</FormLabel>
                        <Input
                          type="password"
                          value={formData.password}
                          onChange={(e) => setFormData({...formData, password: e.target.value})}
                          placeholder="Enter password"
                        />
                      </FormControl>
                    </GridItem>
                  </Grid>

                  <FormControl>
                    <FormLabel>Device Type</FormLabel>
                    <Select
                      value={formData.device_type}
                      onChange={(e) => setFormData({...formData, device_type: e.target.value})}
                    >
                      <option value="mikrotik">MikroTik</option>
                      <option value="cisco">Cisco</option>
                      <option value="juniper">Juniper</option>
                    </Select>
                  </FormControl>

                  <Grid templateColumns="repeat(2, 1fr)" gap={4} w="full">
                    <GridItem>
                      <FormControl display="flex" alignItems="center">
                        <FormLabel mb={0}>Use SSL</FormLabel>
                        <Switch
                          isChecked={formData.use_ssl}
                          onChange={(e) => setFormData({...formData, use_ssl: e.target.checked})}
                          colorScheme="blue"
                        />
                      </FormControl>
                    </GridItem>

                    <GridItem>
                      <FormControl display="flex" alignItems="center">
                        <FormLabel mb={0}>Enabled</FormLabel>
                        <Switch
                          isChecked={formData.enabled}
                          onChange={(e) => setFormData({...formData, enabled: e.target.checked})}
                          colorScheme="green"
                        />
                      </FormControl>
                    </GridItem>
                  </Grid>
                </VStack>
              </ModalBody>

              <ModalFooter>
                <Button
                  variant="outline"
                  mr={3}
                  onClick={() => {
                    onClose();
                    setEditingRouter(null);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" colorScheme="blue">
                  {editingRouter ? 'Update' : 'Create'}
                </Button>
              </ModalFooter>
            </form>
          </ModalContent>
        </Modal>
      </VStack>
    </Container>
  );
};

export default RouterManagement; 