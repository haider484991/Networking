import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  Card,
  CardBody,
  CardHeader,
  Badge,
  Progress,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  FormControl,
  FormLabel,
  Input,
  Select,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Spinner,
  Center,
  Grid,
  GridItem,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  useToast,
  useDisclosure,
  useColorModeValue,
} from '@chakra-ui/react';
import { AddIcon, SettingsIcon, ViewIcon } from '@chakra-ui/icons';

interface NTTNLink {
  link_id: string;
  name: string;
  device_ip: string;
  total_capacity_mbps: number;
  threshold_mbps: number;
  current_usage_mbps: number;
  utilization_percent: number;
  last_updated: string | null;
  status: 'OK' | 'WARNING' | 'CRITICAL';
}

interface NTTNAlert {
  id: number;
  nttn_link_id: string;
  alert_level: string;
  message: string;
  total_mbps: number;
  threshold_mbps: number;
  sent_at: string;
  whatsapp_sent: boolean;
}

interface NTTNVlan {
  id?: number;
  nttn_link_id: string;
  vlan_id: number;
  interface_name: string;
  capacity_mbps: number;
  enabled: boolean;
  description?: string;
  created_at?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function NTTNManagement() {
  const [links, setLinks] = useState<NTTNLink[]>([]);
  const [alerts, setAlerts] = useState<NTTNAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLink, setSelectedLink] = useState<NTTNLink | null>(null);
  const [vlans, setVlans] = useState<NTTNVlan[]>([]);
  const [loadingVlans, setLoadingVlans] = useState(false);
  const { isOpen: isAddOpen, onOpen: onAddOpen, onClose: onAddClose } = useDisclosure();
  const { isOpen: isDetailOpen, onOpen: onDetailOpen, onClose: onDetailClose } = useDisclosure();
  const { isOpen: isVlanOpen, onOpen: onVlanOpen, onClose: onVlanClose } = useDisclosure();
  const { isOpen: isAddVlanOpen, onOpen: onAddVlanOpen, onClose: onAddVlanClose } = useDisclosure();
  const toast = useToast();

  // Form state for adding new NTTN link
  const [formData, setFormData] = useState({
    name: '',
    device_type: 'mikrotik',
    device_ip: '',
    total_capacity_mbps: 1000,
    threshold_mbps: 950,
  });

  // Form state for adding new VLAN
  const [vlanFormData, setVlanFormData] = useState({
    vlan_id: 10,
    interface_name: '',
    capacity_mbps: 200,
    enabled: true,
    description: '',
  });

  // Color mode values
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  useEffect(() => {
    loadData();
    // Set up real-time updates every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      // Load NTTN status
      const statusResponse = await fetch(`${API_BASE_URL}/nttn/status`);
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        setLinks(statusData);
      } else {
        throw new Error(`API returned ${statusResponse.status}`);
      }

      // Load recent alerts
      const alertsResponse = await fetch(`${API_BASE_URL}/nttn/alerts?limit=20`);
      if (alertsResponse.ok) {
        const alertsData = await alertsResponse.json();
        setAlerts(alertsData);
      } else {
        throw new Error(`API returned ${alertsResponse.status}`);
      }
    } catch (error) {
      console.error('Error loading NTTN data:', error);
      // Set empty data when API fails
      setLinks([]);
      setAlerts([]);
      
      // Show toast notification for API error
      toast({
        title: 'NTTN Data Unavailable',
        description: 'Unable to load NTTN monitoring data. Please check API backend.',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OK': return 'green';
      case 'WARNING': return 'yellow';
      case 'CRITICAL': return 'red';
      default: return 'gray';
    }
  };

  const getUtilizationColor = (percent: number) => {
    if (percent >= 95) return 'red';
    if (percent >= 80) return 'yellow';
    return 'green';
  };

  const triggerManualMonitoring = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/nttn/trigger-monitoring`, {
        method: 'POST',
      });

      if (response.ok) {
        toast({
          title: 'Monitoring Triggered',
          description: 'NTTN monitoring cycle has been triggered manually',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        // Reload data after a short delay
        setTimeout(loadData, 2000);
      } else {
        throw new Error('Failed to trigger monitoring');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to trigger monitoring cycle',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleViewDetails = (link: NTTNLink) => {
    setSelectedLink(link);
    onDetailOpen();
  };

  const loadVlans = async (linkId: string) => {
    setLoadingVlans(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/vlans/nttn/${linkId}`);
      if (response.ok) {
        const data = await response.json();
        setVlans(data.vlans || []);
      } else {
        throw new Error('Failed to load VLANs');
      }
    } catch (error) {
      console.error('Error loading VLANs:', error);
      toast({
        title: 'Error Loading VLANs',
        description: 'Unable to load VLAN configurations',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      setVlans([]);
    } finally {
      setLoadingVlans(false);
    }
  };

  const createVlan = async () => {
    if (!selectedLink) return;

    try {
      const vlanData = {
        nttn_link_id: selectedLink.link_id,
        vlan_id: vlanFormData.vlan_id,
        interface_name: vlanFormData.interface_name || `vlan${vlanFormData.vlan_id}`,
        capacity_mbps: vlanFormData.capacity_mbps,
        enabled: vlanFormData.enabled,
        description: vlanFormData.description,
      };

      const response = await fetch(`${API_BASE_URL}/api/vlans/nttn`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(vlanData),
      });

      if (response.ok) {
        toast({
          title: 'VLAN Created',
          description: `VLAN ${vlanFormData.vlan_id} created successfully`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        
        // Reset form and reload VLANs
        setVlanFormData({
          vlan_id: 10,
          interface_name: '',
          capacity_mbps: 200,
          enabled: true,
          description: '',
        });
        
        loadVlans(selectedLink.link_id);
        onAddVlanClose();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create VLAN');
      }
    } catch (error: any) {
      console.error('Error creating VLAN:', error);
      toast({
        title: 'Error Creating VLAN',
        description: error.message || 'Failed to create VLAN configuration',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleManageVlans = (link: NTTNLink) => {
    setSelectedLink(link);
    loadVlans(link.link_id);
    onVlanOpen();
  };

  if (loading) {
    return (
      <Box>
        <VStack spacing={6} align="stretch">
          {/* Header Skeleton */}
          <HStack justify="space-between" align="center">
            <Box>
              <Heading size="lg" mb={2}>NTTN Link Management</Heading>
              <Text color="gray.600">Monitor and manage NTTN link capacity</Text>
            </Box>
            <Button isDisabled colorScheme="blue" leftIcon={<AddIcon />}>
              Add NTTN Link
            </Button>
          </HStack>

          {/* Loading State */}
          <Card bg={cardBg} border="1px solid" borderColor={borderColor}>
            <CardBody>
              <Center py={12}>
                <VStack spacing={4}>
                  <Spinner size="xl" color="purple.500" thickness="4px" />
                  <Text color="gray.500" fontSize="lg">Loading NTTN management data...</Text>
                  <Text color="gray.400" fontSize="sm">Fetching link status and alerts</Text>
                </VStack>
              </Center>
            </CardBody>
          </Card>
        </VStack>
      </Box>
    );
  }

  return (
    <Box p={6}>
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <HStack justify="space-between">
          <VStack align="start" spacing={1}>
            <Heading size="lg">NTTN Link Monitoring</Heading>
            <Text color="gray.600">
              Monitor 5 VLAN aggregation with 950 Mbps threshold alerts
            </Text>
          </VStack>
          <HStack spacing={3}>
            <Button
              leftIcon={<SettingsIcon />}
              colorScheme="blue"
              variant="outline"
              onClick={triggerManualMonitoring}
            >
              Trigger Check
            </Button>
            <Button
              leftIcon={<AddIcon />}
              colorScheme="blue"
              onClick={onAddOpen}
            >
              Add NTTN Link
            </Button>
          </HStack>
        </HStack>

        {/* Summary Stats */}
        <Grid templateColumns={{ base: '1fr', md: 'repeat(4, 1fr)' }} gap={6}>
          <GridItem>
            <Card bg={cardBg} border="1px" borderColor={borderColor}>
              <CardBody>
                <Stat>
                  <StatLabel>Total Links</StatLabel>
                  <StatNumber>{links.length}</StatNumber>
                  <StatHelpText>Active NTTN links</StatHelpText>
                </Stat>
              </CardBody>
            </Card>
          </GridItem>
          <GridItem>
            <Card bg={cardBg} border="1px" borderColor={borderColor}>
              <CardBody>
                <Stat>
                  <StatLabel>Total Capacity</StatLabel>
                  <StatNumber>{links.reduce((sum, link) => sum + link.total_capacity_mbps, 0)} Mbps</StatNumber>
                  <StatHelpText>Aggregate capacity</StatHelpText>
                </Stat>
              </CardBody>
            </Card>
          </GridItem>
          <GridItem>
            <Card bg={cardBg} border="1px" borderColor={borderColor}>
              <CardBody>
                <Stat>
                  <StatLabel>Current Usage</StatLabel>
                  <StatNumber>{links.reduce((sum, link) => sum + link.current_usage_mbps, 0).toFixed(1)} Mbps</StatNumber>
                  <StatHelpText>Real-time aggregate</StatHelpText>
                </Stat>
              </CardBody>
            </Card>
          </GridItem>
          <GridItem>
            <Card bg={cardBg} border="1px" borderColor={borderColor}>
              <CardBody>
                <Stat>
                  <StatLabel>Recent Alerts</StatLabel>
                  <StatNumber>{alerts.length}</StatNumber>
                  <StatHelpText>Last 24 hours</StatHelpText>
                </Stat>
              </CardBody>
            </Card>
          </GridItem>
        </Grid>

        {/* NTTN Links Table */}
        <Card bg={cardBg} border="1px" borderColor={borderColor}>
          <CardHeader>
            <Heading size="md">NTTN Links Status</Heading>
          </CardHeader>
          <CardBody>
            {links.length === 0 ? (
              <Center p={8}>
                <VStack spacing={4}>
                  <Text color="gray.500">No NTTN links configured</Text>
                  <Button leftIcon={<AddIcon />} colorScheme="blue" onClick={onAddOpen}>
                    Add Your First NTTN Link
                  </Button>
                </VStack>
              </Center>
            ) : (
              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th>Name</Th>
                    <Th>Device IP</Th>
                    <Th>Usage</Th>
                    <Th>Utilization</Th>
                    <Th>Status</Th>
                    <Th>Last Updated</Th>
                    <Th>Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {links.map((link) => (
                    <Tr key={link.link_id}>
                      <Td fontWeight="medium">{link.name}</Td>
                      <Td>{link.device_ip}</Td>
                      <Td>
                        <VStack align="start" spacing={1}>
                          <Text fontSize="sm">
                            {link.current_usage_mbps.toFixed(1)} / {link.total_capacity_mbps} Mbps
                          </Text>
                          <Progress
                            value={link.utilization_percent}
                            colorScheme={getUtilizationColor(link.utilization_percent)}
                            size="sm"
                            width="100px"
                          />
                        </VStack>
                      </Td>
                      <Td>
                        <Badge colorScheme={getUtilizationColor(link.utilization_percent)}>
                          {link.utilization_percent.toFixed(1)}%
                        </Badge>
                      </Td>
                      <Td>
                        <Badge colorScheme={getStatusColor(link.status)}>
                          {link.status}
                        </Badge>
                      </Td>
                      <Td>
                        <Text fontSize="sm">
                          {link.last_updated 
                            ? new Date(link.last_updated).toLocaleString()
                            : 'Never'
                          }
                        </Text>
                      </Td>
                      <Td>
                        <HStack spacing={2}>
                          <Button
                            size="sm"
                            leftIcon={<ViewIcon />}
                            variant="outline"
                            onClick={() => handleViewDetails(link)}
                          >
                            Details
                          </Button>
                          <Button
                            size="sm"
                            leftIcon={<SettingsIcon />}
                            colorScheme="blue"
                            variant="outline"
                            onClick={() => handleManageVlans(link)}
                          >
                            VLANs
                          </Button>
                        </HStack>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </CardBody>
        </Card>

        {/* Recent Alerts */}
        <Card bg={cardBg} border="1px" borderColor={borderColor}>
          <CardHeader>
            <Heading size="md">Recent NTTN Alerts</Heading>
          </CardHeader>
          <CardBody>
            {alerts.length === 0 ? (
              <Text color="gray.500">No recent alerts</Text>
            ) : (
              <VStack spacing={3} align="stretch">
                {alerts.slice(0, 5).map((alert) => (
                  <Alert key={alert.id} status={alert.alert_level === 'CRITICAL' ? 'error' : 'warning'}>
                    <AlertIcon />
                    <Box>
                      <AlertTitle>{alert.alert_level} Alert</AlertTitle>
                      <AlertDescription>
                        {alert.message}
                        <Text fontSize="xs" color="gray.600" mt={1}>
                          {new Date(alert.sent_at).toLocaleString()} 
                          {alert.whatsapp_sent && ' • WhatsApp sent'}
                        </Text>
                      </AlertDescription>
                    </Box>
                  </Alert>
                ))}
              </VStack>
            )}
          </CardBody>
        </Card>
      </VStack>

      {/* Add NTTN Link Modal */}
      <Modal isOpen={isAddOpen} onClose={onAddClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add NTTN Link</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Link Name</FormLabel>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter NTTN link name"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Device Type</FormLabel>
                <Select
                  value={formData.device_type}
                  onChange={(e) => setFormData({ ...formData, device_type: e.target.value })}
                >
                  <option value="mikrotik">MikroTik</option>
                  <option value="cisco">Cisco</option>
                  <option value="juniper">Juniper</option>
                </Select>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Device IP Address</FormLabel>
                <Input
                  value={formData.device_ip}
                  onChange={(e) => setFormData({ ...formData, device_ip: e.target.value })}
                  placeholder="103.106.119.201"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Total Capacity (Mbps)</FormLabel>
                <Input
                  type="number"
                  value={formData.total_capacity_mbps}
                  onChange={(e) => setFormData({ ...formData, total_capacity_mbps: parseInt(e.target.value) || 1000 })}
                  placeholder="1000"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Alert Threshold (Mbps)</FormLabel>
                <Input
                  type="number"
                  value={formData.threshold_mbps}
                  onChange={(e) => setFormData({ ...formData, threshold_mbps: parseInt(e.target.value) || 950 })}
                  placeholder="950"
                />
              </FormControl>

              <Alert status="info">
                <AlertIcon />
                <Box>
                  <AlertTitle>VLAN Configuration</AlertTitle>
                  <AlertDescription>
                    After creating the link, VLANs 10, 20, 30, 40, 50 will be automatically configured 
                    with 200 Mbps capacity each.
                  </AlertDescription>
                </Box>
              </Alert>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onAddClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={() => {
              // TODO: Implement add NTTN link functionality
              toast({
                title: 'Feature Coming Soon',
                description: 'NTTN link creation will be implemented in the next update',
                status: 'info',
                duration: 3000,
                isClosable: true,
              });
              onAddClose();
            }}>
              Add Link
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Link Details Modal */}
      <Modal isOpen={isDetailOpen} onClose={onDetailClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>NTTN Link Details</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedLink && (
              <VStack spacing={4} align="stretch">
                <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                  <GridItem>
                    <Text fontWeight="medium">Name:</Text>
                    <Text>{selectedLink.name}</Text>
                  </GridItem>
                  <GridItem>
                    <Text fontWeight="medium">Device IP:</Text>
                    <Text>{selectedLink.device_ip}</Text>
                  </GridItem>
                  <GridItem>
                    <Text fontWeight="medium">Total Capacity:</Text>
                    <Text>{selectedLink.total_capacity_mbps} Mbps</Text>
                  </GridItem>
                  <GridItem>
                    <Text fontWeight="medium">Alert Threshold:</Text>
                    <Text>{selectedLink.threshold_mbps} Mbps</Text>
                  </GridItem>
                </Grid>

                <Box>
                  <Text fontWeight="medium" mb={2}>Current Utilization:</Text>
                  <Progress
                    value={selectedLink.utilization_percent}
                    colorScheme={getUtilizationColor(selectedLink.utilization_percent)}
                    size="lg"
                  />
                  <HStack justify="space-between" mt={1}>
                    <Text fontSize="sm">{selectedLink.current_usage_mbps.toFixed(1)} Mbps</Text>
                    <Text fontSize="sm">{selectedLink.utilization_percent.toFixed(1)}%</Text>
                    <Text fontSize="sm">{selectedLink.total_capacity_mbps} Mbps</Text>
                  </HStack>
                </Box>

                <Alert status={selectedLink.status === 'CRITICAL' ? 'error' : selectedLink.status === 'WARNING' ? 'warning' : 'success'}>
                  <AlertIcon />
                  <Box>
                    <AlertTitle>Status: {selectedLink.status}</AlertTitle>
                    <AlertDescription>
                      {selectedLink.status === 'CRITICAL' && 'Link usage is above 100% capacity!'}
                      {selectedLink.status === 'WARNING' && 'Link usage is above 95% capacity.'}
                      {selectedLink.status === 'OK' && 'Link is operating within normal parameters.'}
                    </AlertDescription>
                  </Box>
                </Alert>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button onClick={onDetailClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* VLAN Management Modal */}
      <Modal isOpen={isVlanOpen} onClose={onVlanClose} size="6xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            VLAN Management - {selectedLink?.name}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={6} align="stretch">
              {/* VLAN Summary */}
              <HStack justify="space-between">
                <VStack align="start" spacing={1}>
                  <Heading size="sm">VLAN Configurations</Heading>
                  <Text color="gray.600" fontSize="sm">
                    Manage VLANs for NTTN link bandwidth monitoring
                  </Text>
                </VStack>
                <Button
                  leftIcon={<AddIcon />}
                  colorScheme="blue"
                  onClick={onAddVlanOpen}
                >
                  Add VLAN
                </Button>
              </HStack>

              {/* VLANs Table */}
              {loadingVlans ? (
                <Center py={8}>
                  <VStack spacing={3}>
                    <Spinner size="lg" color="blue.500" />
                    <Text color="gray.500">Loading VLANs...</Text>
                  </VStack>
                </Center>
              ) : vlans.length === 0 ? (
                <Center py={8}>
                  <VStack spacing={4}>
                    <Text color="gray.500">No VLANs configured for this link</Text>
                    <Button
                      leftIcon={<AddIcon />}
                      colorScheme="blue"
                      onClick={onAddVlanOpen}
                    >
                      Add Your First VLAN
                    </Button>
                  </VStack>
                </Center>
              ) : (
                <Card>
                  <CardBody>
                    <Table variant="simple">
                      <Thead>
                        <Tr>
                          <Th>VLAN ID</Th>
                          <Th>Interface Name</Th>
                          <Th>Capacity</Th>
                          <Th>Status</Th>
                          <Th>Description</Th>
                          <Th>Created</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {vlans.map((vlan) => (
                          <Tr key={vlan.id || vlan.vlan_id}>
                            <Td>
                              <Badge colorScheme="blue" fontSize="sm">
                                VLAN {vlan.vlan_id}
                              </Badge>
                            </Td>
                            <Td>
                              <Text fontFamily="mono" fontSize="sm">
                                {vlan.interface_name}
                              </Text>
                            </Td>
                            <Td>
                              <Text fontWeight="medium">
                                {vlan.capacity_mbps} Mbps
                              </Text>
                            </Td>
                            <Td>
                              <Badge 
                                colorScheme={vlan.enabled ? 'green' : 'red'}
                                variant="subtle"
                              >
                                {vlan.enabled ? 'Enabled' : 'Disabled'}
                              </Badge>
                            </Td>
                            <Td>
                              <Text fontSize="sm" color="gray.600">
                                {vlan.description || 'No description'}
                              </Text>
                            </Td>
                            <Td>
                              <Text fontSize="sm" color="gray.500">
                                {vlan.created_at 
                                  ? new Date(vlan.created_at).toLocaleDateString()
                                  : 'Unknown'
                                }
                              </Text>
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </CardBody>
                </Card>
              )}

              {/* VLAN Summary Stats */}
              {vlans.length > 0 && (
                <Grid templateColumns="repeat(3, 1fr)" gap={4}>
                  <GridItem>
                    <Stat>
                      <StatLabel>Total VLANs</StatLabel>
                      <StatNumber>{vlans.length}</StatNumber>
                      <StatHelpText>Configured</StatHelpText>
                    </Stat>
                  </GridItem>
                  <GridItem>
                    <Stat>
                      <StatLabel>Active VLANs</StatLabel>
                      <StatNumber>{vlans.filter(v => v.enabled).length}</StatNumber>
                      <StatHelpText>Enabled</StatHelpText>
                    </Stat>
                  </GridItem>
                  <GridItem>
                    <Stat>
                      <StatLabel>Total Capacity</StatLabel>
                      <StatNumber>
                        {vlans.filter(v => v.enabled).reduce((sum, v) => sum + v.capacity_mbps, 0)} Mbps
                      </StatNumber>
                      <StatHelpText>Aggregate</StatHelpText>
                    </Stat>
                  </GridItem>
                </Grid>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button onClick={onVlanClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Add VLAN Modal */}
      <Modal isOpen={isAddVlanOpen} onClose={onAddVlanClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add New VLAN</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>VLAN ID</FormLabel>
                <Input
                  type="number"
                  value={vlanFormData.vlan_id}
                  onChange={(e) => setVlanFormData({ 
                    ...vlanFormData, 
                    vlan_id: parseInt(e.target.value) || 10 
                  })}
                  placeholder="10"
                  min="1"
                  max="4094"
                />
                <Text fontSize="sm" color="gray.500">
                  Valid range: 1-4094 (common: 10, 20, 30, 40, 50)
                </Text>
              </FormControl>

              <FormControl>
                <FormLabel>Interface Name</FormLabel>
                <Input
                  value={vlanFormData.interface_name}
                  onChange={(e) => setVlanFormData({ 
                    ...vlanFormData, 
                    interface_name: e.target.value 
                  })}
                  placeholder={`vlan${vlanFormData.vlan_id}`}
                />
                <Text fontSize="sm" color="gray.500">
                  Leave empty to auto-generate (e.g., vlan{vlanFormData.vlan_id})
                </Text>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Capacity (Mbps)</FormLabel>
                <Input
                  type="number"
                  value={vlanFormData.capacity_mbps}
                  onChange={(e) => setVlanFormData({ 
                    ...vlanFormData, 
                    capacity_mbps: parseInt(e.target.value) || 200 
                  })}
                  placeholder="200"
                  min="1"
                />
                <Text fontSize="sm" color="gray.500">
                  Expected bandwidth capacity for this VLAN
                </Text>
              </FormControl>

              <FormControl>
                <FormLabel>Description (Optional)</FormLabel>
                <Input
                  value={vlanFormData.description}
                  onChange={(e) => setVlanFormData({ 
                    ...vlanFormData, 
                    description: e.target.value 
                  })}
                  placeholder="e.g., Voice Traffic, Data Traffic, etc."
                />
              </FormControl>

              <FormControl display="flex" alignItems="center">
                <FormLabel mb="0">Enable VLAN</FormLabel>
                <input
                  type="checkbox"
                  checked={vlanFormData.enabled}
                  onChange={(e) => setVlanFormData({ 
                    ...vlanFormData, 
                    enabled: e.target.checked 
                  })}
                />
              </FormControl>

              <Alert status="info">
                <AlertIcon />
                <Box>
                  <AlertTitle>VLAN Configuration</AlertTitle>
                  <AlertDescription>
                    This VLAN will be monitored for bandwidth usage as part of the NTTN link monitoring.
                    Make sure the VLAN exists on your router before adding it here.
                  </AlertDescription>
                </Box>
              </Alert>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onAddVlanClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={createVlan}>
              Add VLAN
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
} 