import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  useToast,
  VStack,
  HStack,
  IconButton,
  AlertDialog,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
} from '@chakra-ui/react';
import { AddIcon, EditIcon, DeleteIcon, DownloadIcon } from '@chakra-ui/icons';
import { apiClient, Reseller, CreateResellerRequest, UpdateResellerRequest } from '../utils/api';

interface ResellerManagementProps {
  resellers: Reseller[];
  onResellerChange: () => void;
  initialReseller?: Reseller | null;
  onResellerManaged?: () => void;
}

export default function ResellerManagement({ 
  resellers, 
  onResellerChange, 
  initialReseller,
  onResellerManaged 
}: ResellerManagementProps) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { 
    isOpen: isDeleteOpen, 
    onOpen: onDeleteOpen, 
    onClose: onDeleteClose 
  } = useDisclosure();
  
  const [editingReseller, setEditingReseller] = useState<Reseller | null>(null);
  const [deletingReseller, setDeletingReseller] = useState<Reseller | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    plan_mbps: 100,
    threshold: 0.8,
    phone: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  // Handle initial reseller from dashboard
  useEffect(() => {
    if (initialReseller) {
      handleOpenEdit(initialReseller);
      onResellerManaged?.();
    }
  }, [initialReseller, onResellerManaged]);

  const handleOpenAdd = () => {
    setEditingReseller(null);
    setFormData({
      name: '',
      plan_mbps: 100,
      threshold: 0.8,
      phone: ''
    });
    onOpen();
  };

  const handleOpenEdit = (reseller: Reseller) => {
    setEditingReseller(reseller);
    setFormData({
      name: reseller.name,
      plan_mbps: reseller.plan_mbps,
      threshold: reseller.threshold,
      phone: reseller.phone
    });
    onOpen();
  };

  const handleOpenDelete = (reseller: Reseller) => {
    setDeletingReseller(reseller);
    onDeleteOpen();
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      if (editingReseller) {
        // Update existing reseller
        await apiClient.updateReseller(editingReseller.id, formData);
        toast({
          title: 'Reseller updated',
          description: `${formData.name} has been updated successfully.`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        // Create new reseller
        await apiClient.createReseller(formData as CreateResellerRequest);
        toast({
          title: 'Reseller created',
          description: `${formData.name} has been created successfully.`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      }
      
      onResellerChange();
      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save reseller',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingReseller) return;
    
    setIsLoading(true);
    try {
      await apiClient.deleteReseller(deletingReseller.id);
      toast({
        title: 'Reseller deleted',
        description: `${deletingReseller.name} has been deleted successfully.`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      onResellerChange();
      onDeleteClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete reseller',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box>
      <Button
        leftIcon={<AddIcon />}
        colorScheme="blue"
        onClick={handleOpenAdd}
        mb={4}
      >
        Add New Reseller
      </Button>

      {/* Add/Edit Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {editingReseller ? 'Edit Reseller' : 'Add New Reseller'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Name</FormLabel>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter reseller name"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Plan (Mbps)</FormLabel>
                <Input
                  type="number"
                  value={formData.plan_mbps}
                  onChange={(e) => setFormData({ ...formData, plan_mbps: parseInt(e.target.value) || 0 })}
                  placeholder="Enter bandwidth plan in Mbps"
                />
              </FormControl>

              <FormControl>
                <FormLabel>Threshold (0.0 - 1.0)</FormLabel>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="1"
                  value={formData.threshold}
                  onChange={(e) => setFormData({ ...formData, threshold: parseFloat(e.target.value) || 0.8 })}
                  placeholder="Enter alert threshold (e.g., 0.8 for 80%)"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Phone</FormLabel>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Enter phone number (e.g., +8801000000001)"
                />
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button 
              colorScheme="blue" 
              onClick={handleSubmit}
              isLoading={isLoading}
            >
              {editingReseller ? 'Update' : 'Create'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        isOpen={isDeleteOpen}
        leastDestructiveRef={undefined}
        onClose={onDeleteClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Reseller
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete {deletingReseller?.name}? This action cannot be undone.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button onClick={onDeleteClose}>
                Cancel
              </Button>
              <Button 
                colorScheme="red" 
                onClick={handleDelete}
                ml={3}
                isLoading={isLoading}
              >
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
}

// Export action buttons component to be used in the table
export function ResellerActionButtons({ 
  reseller, 
  onEdit, 
  onDelete 
}: { 
  reseller: Reseller;
  onEdit: (reseller: Reseller) => void;
  onDelete: (reseller: Reseller) => void;
}) {
  const toast = useToast();

  const handleDownloadReport = async () => {
    try {
      // Use the API client to get the report
      const response = await fetch(`http://localhost:8000/resellers/${reseller.id}/report`, {
        method: 'GET',
        headers: {
          'Accept': 'application/pdf',
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${reseller.name}_report_${new Date().toISOString().slice(0, 7)}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast({
          title: 'Report downloaded',
          description: `PDF report for ${reseller.name} has been downloaded.`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        throw new Error(`Failed to download report: ${response.status}`);
      }
    } catch (error) {
      console.error('Error downloading report:', error);
      toast({
        title: 'Download failed',
        description: 'Failed to download PDF report. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  return (
    <HStack spacing={2}>
      <IconButton
        aria-label="Download PDF report"
        icon={<DownloadIcon />}
        size="sm"
        colorScheme="green"
        variant="ghost"
        onClick={handleDownloadReport}
      />
      <IconButton
        aria-label="Edit reseller"
        icon={<EditIcon />}
        size="sm"
        colorScheme="blue"
        variant="ghost"
        onClick={() => onEdit(reseller)}
      />
      <IconButton
        aria-label="Delete reseller"
        icon={<DeleteIcon />}
        size="sm"
        colorScheme="red"
        variant="ghost"
        onClick={() => onDelete(reseller)}
      />
    </HStack>
  );
} 