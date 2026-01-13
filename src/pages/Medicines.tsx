import React, { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';
import { Medicine } from '@/types/pharmacy';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Pill, Edit, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const Medicines: React.FC = () => {
  const { userRole, hasRole } = useAuth();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Check if user can create/edit medicines (admin, manager, pharmacist)
  const canManageMedicines = hasRole('admin') || hasRole('manager') || hasRole('pharmacist');
  const canDeleteMedicines = hasRole('admin');

  // Medicine categories from backend enum
  const categories = [
    { value: 'tablet', label: 'Tablet' },
    { value: 'capsule', label: 'Capsule' },
    { value: 'syrup', label: 'Syrup' },
    { value: 'injection', label: 'Injection' },
    { value: 'ointment', label: 'Ointment' },
    { value: 'drops', label: 'Drops' },
    { value: 'other', label: 'Other' },
  ];

  // Form state - matching backend model (static data only, no pricing/stock)
  const [formData, setFormData] = useState({
    name: '',
    genericName: '',
    category: 'tablet' as Medicine['category'],
    manufacturer: '',
    dosageForm: '',
    strength: '',
    barcode: '',
    prescriptionRequired: false,
    description: '',
    sideEffects: '',
    status: 'active' as 'active' | 'inactive',
  });

  const fetchMedicines = async (search?: string) => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching medicines, search:', search);
      const response = await apiClient.getMedicines({
        search: search || undefined,
      });
      console.log('Medicines response:', response);
      
      if (response.success) {
        // Handle both array and object with data property
        const medicinesData = Array.isArray(response.data) 
          ? response.data 
          : (response.data?.data || []);
        
        // Map backend data to frontend format
        const mappedMedicines = medicinesData.map((med: any) => ({
          ...med,
          id: med._id || med.id,
        }));
        console.log('Mapped medicines:', mappedMedicines);
        setMedicines(mappedMedicines);
      } else {
        console.warn('Medicines response not successful:', response);
        setMedicines([]);
        setError(response.message || 'Failed to fetch medicines');
      }
    } catch (error: any) {
      console.error('Error fetching medicines:', error);
      const errorMessage = error.message || 'Failed to fetch medicines';
      toast.error(errorMessage);
      setError(errorMessage);
      setMedicines([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial load
    fetchMedicines();
  }, []);

  useEffect(() => {
    // Debounced search
    if (searchQuery === '') {
      // If search is cleared, reload all medicines
      fetchMedicines();
      return;
    }
    
    const debounceTimer = setTimeout(() => {
      fetchMedicines(searchQuery);
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const resetForm = () => {
    setFormData({
      name: '',
      genericName: '',
      category: 'tablet',
      manufacturer: '',
      dosageForm: '',
      strength: '',
      barcode: '',
      prescriptionRequired: false,
      description: '',
      sideEffects: '',
      status: 'active',
    });
    setEditingMedicine(null);
  };

  const handleEdit = (medicine: Medicine) => {
    setEditingMedicine(medicine);
    setFormData({
      name: medicine.name,
      genericName: medicine.genericName || '',
      category: medicine.category,
      manufacturer: medicine.manufacturer || '',
      dosageForm: medicine.dosageForm || '',
      strength: medicine.strength || '',
      barcode: medicine.barcode || '',
      prescriptionRequired: medicine.prescriptionRequired,
      description: medicine.description || '',
      sideEffects: medicine.sideEffects || '',
      status: medicine.status,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const medicineData = {
        name: formData.name,
        genericName: formData.genericName || undefined,
        category: formData.category,
        manufacturer: formData.manufacturer || undefined,
        dosageForm: formData.dosageForm || undefined,
        strength: formData.strength || undefined,
        barcode: formData.barcode || undefined,
        prescriptionRequired: formData.prescriptionRequired,
        description: formData.description || undefined,
        sideEffects: formData.sideEffects || undefined,
        status: formData.status,
      };

      if (editingMedicine) {
        const response = await apiClient.updateMedicine(editingMedicine._id || editingMedicine.id || '', medicineData);
        if (response.success) {
          toast.success('Medicine updated successfully');
        } else {
          throw new Error(response.message || 'Failed to update medicine');
        }
      } else {
        const response = await apiClient.createMedicine(medicineData);
        if (response.success) {
          toast.success('Medicine added successfully');
        } else {
          throw new Error(response.message || 'Failed to create medicine');
        }
      }

      setIsDialogOpen(false);
      resetForm();
      fetchMedicines();
    } catch (error: any) {
      console.error('Error saving medicine:', error);
      toast.error(error.message || 'Failed to save medicine');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this medicine?')) return;

    try {
      const response = await apiClient.deleteMedicine(id);
      if (response.success) {
        toast.success('Medicine deleted successfully');
        fetchMedicines();
      } else {
        throw new Error(response.message || 'Failed to delete medicine');
      }
    } catch (error: any) {
      console.error('Error deleting medicine:', error);
      toast.error(error.message || 'Failed to delete medicine');
    }
  };

  const formatCurrency = (amount: number) => {
    return `रू ${amount.toLocaleString('en-NP', { minimumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Medicines</h1>
          <p className="text-muted-foreground mt-1">
            Manage your medicine catalog
          </p>
        </div>
        {canManageMedicines && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="btn-pharmacy-primary" onClick={resetForm}>
                <Plus size={18} className="mr-2" />
                Add Medicine
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingMedicine ? 'Edit Medicine' : 'Add New Medicine'}
                </DialogTitle>
                <DialogDescription>
                  {editingMedicine
                    ? 'Update the medicine details'
                    : 'Fill in the details to add a new medicine to your catalog'}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Medicine Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="Paracetamol 500mg"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="genericName">Generic Name *</Label>
                    <Input
                      id="genericName"
                      value={formData.genericName}
                      onChange={(e) =>
                        setFormData({ ...formData, genericName: e.target.value })
                      }
                      placeholder="Acetaminophen"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) =>
                        setFormData({ ...formData, category: value as Medicine['category'] })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manufacturer">Manufacturer *</Label>
                    <Input
                      id="manufacturer"
                      value={formData.manufacturer}
                      onChange={(e) =>
                        setFormData({ ...formData, manufacturer: e.target.value })
                      }
                      placeholder="Pharma Company Ltd."
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dosageForm">Dosage Form *</Label>
                    <Input
                      id="dosageForm"
                      value={formData.dosageForm}
                      onChange={(e) =>
                        setFormData({ ...formData, dosageForm: e.target.value })
                      }
                      placeholder="Tablet"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="strength">Strength *</Label>
                    <Input
                      id="strength"
                      value={formData.strength}
                      onChange={(e) =>
                        setFormData({ ...formData, strength: e.target.value })
                      }
                      placeholder="500mg"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="barcode">Barcode</Label>
                  <Input
                    id="barcode"
                    value={formData.barcode}
                    onChange={(e) =>
                      setFormData({ ...formData, barcode: e.target.value })
                    }
                    placeholder="Optional barcode"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="prescription"
                      checked={formData.prescriptionRequired}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, prescriptionRequired: checked })
                      }
                    />
                    <Label htmlFor="prescription">Requires Prescription</Label>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) =>
                        setFormData({ ...formData, status: value as 'active' | 'inactive' })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Optional description"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sideEffects">Side Effects</Label>
                  <Input
                    id="sideEffects"
                    value={formData.sideEffects}
                    onChange={(e) =>
                      setFormData({ ...formData, sideEffects: e.target.value })
                    }
                    placeholder="Optional side effects"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="btn-pharmacy-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  {editingMedicine ? 'Update' : 'Add'} Medicine
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        )}
      </div>

      {/* Search */}
      <Card className="pharmacy-card">
        <CardContent className="pt-6">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
              size={18}
            />
            <Input
              placeholder="Search medicines by name, generic name, or manufacturer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Medicines Table */}
      <Card className="pharmacy-card">
        <CardContent className="p-0">
          {error && (
            <div className="p-4 text-center">
              <p className="text-destructive">{error}</p>
              <Button 
                variant="outline" 
                className="mt-2"
                onClick={() => fetchMedicines()}
              >
                Retry
              </Button>
            </div>
          )}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : !error && medicines.length === 0 ? (
            <div className="text-center py-12">
              <Pill className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium text-muted-foreground">
                No medicines found
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {searchQuery
                  ? 'Try adjusting your search'
                  : 'Add your first medicine to get started'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="table-header">
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Manufacturer</TableHead>
                  <TableHead>Strength</TableHead>
                  <TableHead className="text-center">Prescription</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {medicines.map((medicine) => (
                  <TableRow key={medicine._id || medicine.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{medicine.name}</p>
                        {medicine.genericName && (
                          <p className="text-sm text-muted-foreground">
                            {medicine.genericName}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {categories.find(c => c.value === medicine.category)?.label || medicine.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {medicine.manufacturer || (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {medicine.strength || (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {medicine.prescriptionRequired ? (
                        <Badge variant="outline" className="badge-warning">
                          Required
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="badge-success">
                          OTC
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={medicine.status === 'active' ? 'default' : 'secondary'}>
                        {medicine.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {canManageMedicines && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(medicine)}
                          >
                            <Edit size={16} />
                          </Button>
                        )}
                        {canDeleteMedicines && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(medicine._id || medicine.id || '')}
                          >
                            <Trash2 size={16} />
                          </Button>
                        )}
                        {!canManageMedicines && !canDeleteMedicines && (
                          <span className="text-sm text-muted-foreground">View only</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Medicines;

