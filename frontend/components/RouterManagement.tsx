import React, { useState, useEffect, useCallback } from 'react';
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
  Divider,
  Collapse,
  Tag,
  TagLabel,
  TagLeftIcon,
  Checkbox,
  Textarea,
} from '@chakra-ui/react';
import { AddIcon, EditIcon, DeleteIcon, SettingsIcon, TimeIcon, DownloadIcon, RepeatIcon } from '@chakra-ui/icons';

// Interfaces
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
  os_version?: string;
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

interface BackupFile {
  name: string;
  size: string;
  'creation-time': string;
}

interface RouterManagementProps {
  onAlert: (message: string, type: 'success' | 'error') => void;
}

const RouterManagement: React.FC<RouterManagementProps> = ({ onAlert }) => {
  // State
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
  const [expandedRouter, setExpandedRouter] = useState<string | null>(null);
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [selectedRouters, setSelectedRouters] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState('');
  const [bulkPayload, setBulkPayload] = useState('');
  const { isOpen: isBulkOpen, onOpen: onBulkOpen, onClose: onBulkClose } = useDisclosure();
  const [loadingOsVersion, setLoadingOsVersion] = useState<string | null>(null);

  // Hooks
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const toast = useToast();

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  // Effects
  useEffect(() => {
    fetchRouters();
  }, []);

  // Functions
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

  const fetchBackups = useCallback(async (routerId: string) => {
    setLoadingBackups(true);
    try {
      const response = await fetch(`${API_BASE}/api/routers/${routerId}/backups`);
      if (!response.ok) throw new Error('Failed to fetch backups');
      const data = await response.json();
      setBackups(data.backups || []);
    } catch (error) {
      console.error('Error fetching backups:', error);
      toast({ title: 'Error fetching backups', status: 'error' });
    } finally {
      setLoadingBackups(false);
    }
  }, [API_BASE, toast]);

  const handleToggleRouterDetails = (routerId: string) => {
    if (expandedRouter === routerId) {
      setExpandedRouter(null);
    } else {
      setExpandedRouter(routerId);
      fetchBackups(routerId);
    }
  };

  const handleCreateBackup = async (routerId: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/routers/${routerId}/backups`, { method: 'POST' });
      if (!response.ok) throw new Error('Failed to create backup');
      toast({ title: 'Backup created successfully', status: 'success' });
      fetchBackups(routerId);
    } catch (error) {
      console.error('Error creating backup:', error);
      toast({ title: 'Error creating backup', status: 'error' });
    }
  };

  const handleDeleteBackup = async (routerId: string, backupName: string) => {
    if (!confirm(`Are you sure you want to delete backup ${backupName}?`)) return;
    try {
      const response = await fetch(`${API_BASE}/api/routers/${routerId}/backups/${backupName}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete backup');
      toast({ title: 'Backup deleted successfully', status: 'success' });
      fetchBackups(routerId);
    } catch (error) {
      console.error('Error deleting backup:', error);
      toast({ title: 'Error deleting backup', status: 'error' });
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

  const handleBulkAction = async () => {
    try {
      const payload = bulkPayload ? JSON.parse(bulkPayload) : null;
      const response = await fetch(`${API_BASE}/api/routers/bulk-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ router_ids: selectedRouters, action: bulkAction, payload })
      });
      const result = await response.json();
      // TODO: Display detailed results
      toast({ title: 'Bulk action completed', status: 'info' });
      onBulkClose();
    } catch (error) {
      console.error('Error performing bulk action:', error);
      toast({ title: 'Error performing bulk action', status: 'error' });
    }
  };

  const handleFetchOsVersion = async (routerId: string) => {
    setLoadingOsVersion(routerId);
    try {
      const response = await fetch(`${API_BASE}/api/routers/${routerId}/os-version`);
      const result = await response.json();
      if (response.ok) {
        setRouters(prev => prev.map(r => r.id === routerId ? { ...r, os_version: result.os_version } : r));
        toast({ title: 'OS version updated', status: 'success' });
      } else {
        throw new Error(result.detail || 'Failed to fetch OS version');
      }
    } catch (error) {
      console.error('Error fetching OS version:', error);
      toast({ title: 'Error fetching OS version', status: 'error' });
    } finally {
      setLoadingOsVersion(null);
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

  const handleSelectRouter = (routerId: string) => {
    setSelectedRouters(prev => 
      prev.includes(routerId) ? prev.filter(id => id !== routerId) : [...prev, routerId]
    );
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
          <HStack>
            <Button onClick={onBulkOpen} disabled={selectedRouters.length === 0}>Bulk Actions</Button>
            <Button
              leftIcon={<AddIcon />}
              colorScheme="blue"
              onClick={openAddModal}
              size="md"
            >
              Add Router
            </Button>
          </HStack>
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
                    <Th><Checkbox onChange={(e) => setSelectedRouters(e.target.checked ? routers.map(r => r.id) : [])} /></Th>
                    <Th>Details</Th>
                    <Th>Connection</Th>
                    <Th>OS Version</Th>
                    <Th>Status</Th>
                    <Th>Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {routers.map((router) => (
                    <React.Fragment key={router.id}>
                      <Tr onClick={() => handleToggleRouterDetails(router.id)} cursor="pointer">
                        <Td><Checkbox isChecked={selectedRouters.includes(router.id)} onChange={() => handleSelectRouter(router.id)} onClick={(e) => e.stopPropagation()} /></Td>
                        <Td>
                          <VStack align="flex-start">
                            <Text fontWeight="bold">{router.name}</Text>
                            <Text fontSize="sm" color="gray.500">{router.id}</Text>
                          </VStack>
                        </Td>
                        <Td>{router.host}:{router.port}</Td>
                        <Td>
                          {router.os_version || 'N/A'}
                          <IconButton 
                            aria-label="Refresh OS Version" 
                            icon={<RepeatIcon />} 
                            size="xs" 
                            ml={2} 
                            onClick={(e) => { e.stopPropagation(); handleFetchOsVersion(router.id); }} 
                            isLoading={loadingOsVersion === router.id} 
                          />
                        </Td>
                        <Td><Badge colorScheme={router.enabled ? 'green' : 'red'}>{router.enabled ? 'Enabled' : 'Disabled'}</Badge></Td>
                        <Td>
                          <HStack>
                            <IconButton aria-label="Test Connection" icon={<SettingsIcon />} onClick={(e) => { e.stopPropagation(); testConnection(router.id); }} isLoading={testingConnection === router.id} />
                            <IconButton aria-label="Edit" icon={<EditIcon />} onClick={(e) => { e.stopPropagation(); openEditModal(router); }} />
                            <IconButton aria-label="Delete" icon={<DeleteIcon />} onClick={(e) => { e.stopPropagation(); handleDelete(router.id); }} />
                          </HStack>
                        </Td>
                      </Tr>
                      <Tr>
                        <Td colSpan={6} p={0} border="none">
                          <Collapse in={expandedRouter === router.id} animateOpacity>
                            <Box p={4} bg={useColorModeValue('gray.50', 'gray.700')}>
                              <VStack align="stretch" spacing={4}>
                                <Heading size="sm">Backups</Heading>
                                {loadingBackups ? (
                                  <Center><Spinner /></Center>
                                ) : (
                                  <VStack align="stretch">
                                    {backups.map(backup => (
                                      <HStack key={backup.name} justify="space-between">
                                        <VStack align="flex-start">
                                          <Text>{backup.name}</Text>
                                          <Text fontSize="xs" color="gray.500">Size: {backup.size} | Created: {backup['creation-time']}</Text>
                                        </VStack>
                                        <HStack>
                                          <IconButton aria-label="Download" icon={<DownloadIcon />} size="sm" />
                                          <IconButton aria-label="Delete" icon={<DeleteIcon />} size="sm" onClick={() => handleDeleteBackup(router.id, backup.name)} />
                                        </HStack>
                                      </HStack>
                                    ))}
                                  </VStack>
                                )}
                                <Button size="sm" onClick={() => handleCreateBackup(router.id)}>Create Backup</Button>
                              </VStack>
                            </Box>
                          </Collapse>
                        </Td>
                      </Tr>
                    </React.Fragment>
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

        {/* Bulk Action Modal */}
        <Modal isOpen={isBulkOpen} onClose={onBulkClose}>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Bulk Action</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <VStack spacing={4}>
                <FormControl>
                  <FormLabel>Action</FormLabel>
                  <Select placeholder="Select action" onChange={(e) => setBulkAction(e.target.value)}>
                    <option value="reboot">Reboot</option>
                    <option value="add_firewall_rule">Add Firewall Rule</option>
                    <option value="update_qos_rule">Update QoS Rule</option>
                  </Select>
                </FormControl>
                {(bulkAction === 'add_firewall_rule' || bulkAction === 'update_qos_rule') && (
                  <FormControl>
                    <FormLabel>Payload (JSON)</FormLabel>
                    <Textarea value={bulkPayload} onChange={(e) => setBulkPayload(e.target.value)} />
                  </FormControl>
                )}
              </VStack>
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={onBulkClose}>Cancel</Button>
              <Button colorScheme="blue" onClick={handleBulkAction}>Run Action</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </VStack>
    </Container>
  );
};

export default RouterManagement; 