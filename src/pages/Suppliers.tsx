import React, { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';
import { Supplier } from '@/types/pharmacy';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { Truck, Plus, Search, Edit, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const Suppliers: React.FC = () => {
  const { hasRole } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const canManageSuppliers = hasRole('admin') || hasRole('manager');
  const canDeleteSuppliers = hasRole('admin');

  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    email: '',
    mobile: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      country: 'Nepal',
      postalCode: '',
    },
    taxId: '',
    paymentTerms: 'cash' as Supplier['paymentTerms'],
    creditLimit: '0',
    status: 'active' as 'active' | 'inactive',
    notes: '',
  });

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getSuppliers({
        search: searchQuery || undefined,
      });
      if (response.success && response.data) {
        const mapped = response.data.map((sup: any) => ({
          ...sup,
          id: sup._id || sup.id,
        }));
        setSuppliers(mapped);
      }
    } catch (error: any) {
      console.error('Error fetching suppliers:', error);
      toast.error(error.message || 'Failed to fetch suppliers');
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchSuppliers();
    }, 500);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const resetForm = () => {
    setFormData({
      name: '',
      contactPerson: '',
      email: '',
      mobile: '',
      phone: '',
      address: {
        street: '',
        city: '',
        state: '',
        country: 'Nepal',
        postalCode: '',
      },
      taxId: '',
      paymentTerms: 'cash',
      creditLimit: '0',
      status: 'active',
      notes: '',
    });
    setEditingSupplier(null);
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      contactPerson: supplier.contactPerson,
      email: supplier.email || '',
      mobile: supplier.mobile,
      phone: supplier.phone || '',
      address: supplier.address || {
        street: '',
        city: '',
        state: '',
        country: 'Nepal',
        postalCode: '',
      },
      taxId: supplier.taxId || '',
      paymentTerms: supplier.paymentTerms || 'cash',
      creditLimit: (supplier.creditLimit || 0).toString(),
      status: supplier.status,
      notes: supplier.notes || '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const supplierData = {
        name: formData.name,
        contactPerson: formData.contactPerson,
        email: formData.email || undefined,
        mobile: formData.mobile,
        phone: formData.phone || undefined,
        address: formData.address,
        taxId: formData.taxId || undefined,
        paymentTerms: formData.paymentTerms,
        creditLimit: parseFloat(formData.creditLimit) || 0,
        status: formData.status,
        notes: formData.notes || undefined,
      };

      if (editingSupplier) {
        const response = await apiClient.updateSupplier(editingSupplier._id || editingSupplier.id || '', supplierData);
        if (response.success) {
          toast.success('Supplier updated successfully');
        } else {
          throw new Error(response.message || 'Failed to update supplier');
        }
      } else {
        const response = await apiClient.createSupplier(supplierData);
        if (response.success) {
          toast.success('Supplier added successfully');
        } else {
          throw new Error(response.message || 'Failed to create supplier');
        }
      }

      setIsDialogOpen(false);
      resetForm();
      fetchSuppliers();
    } catch (error: any) {
      console.error('Error saving supplier:', error);
      toast.error(error.message || 'Failed to save supplier');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this supplier?')) return;

    try {
      const response = await apiClient.deleteSupplier(id);
      if (response.success) {
        toast.success('Supplier deleted successfully');
        fetchSuppliers();
      } else {
        throw new Error(response.message || 'Failed to delete supplier');
      }
    } catch (error: any) {
      console.error('Error deleting supplier:', error);
      toast.error(error.message || 'Failed to delete supplier');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Suppliers</h1>
          <p className="text-muted-foreground mt-1">Manage your suppliers</p>
        </div>
        {canManageSuppliers && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="btn-pharmacy-primary" onClick={resetForm}>
                <Plus size={18} className="mr-2" />
                Add Supplier
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>
                    {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingSupplier
                      ? 'Update the supplier details'
                      : 'Fill in the details to add a new supplier'}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Supplier Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        placeholder="ABC Pharmaceuticals"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contactPerson">Contact Person *</Label>
                      <Input
                        id="contactPerson"
                        value={formData.contactPerson}
                        onChange={(e) =>
                          setFormData({ ...formData, contactPerson: e.target.value })
                        }
                        placeholder="John Doe"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        placeholder="supplier@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mobile">Mobile *</Label>
                      <Input
                        id="mobile"
                        value={formData.mobile}
                        onChange={(e) =>
                          setFormData({ ...formData, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })
                        }
                        placeholder="9841234567"
                        maxLength={10}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={formData.address.street || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          address: { ...formData.address, street: e.target.value },
                        })
                      }
                      placeholder="Street address"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="paymentTerms">Payment Terms</Label>
                      <Select
                        value={formData.paymentTerms}
                        onValueChange={(value: any) =>
                          setFormData({ ...formData, paymentTerms: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="credit-7">Credit 7 Days</SelectItem>
                          <SelectItem value="credit-15">Credit 15 Days</SelectItem>
                          <SelectItem value="credit-30">Credit 30 Days</SelectItem>
                          <SelectItem value="credit-60">Credit 60 Days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value: any) =>
                          setFormData({ ...formData, status: value })
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
                    {editingSupplier ? 'Update' : 'Add'} Supplier
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card className="pharmacy-card">
        <CardContent className="pt-6">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
              size={18}
            />
            <Input
              placeholder="Search suppliers by name, contact person, or mobile..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="pharmacy-card">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : suppliers.length === 0 ? (
            <div className="text-center py-12">
              <Truck className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium text-muted-foreground">
                No suppliers found
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {searchQuery
                  ? 'Try adjusting your search'
                  : 'Add your first supplier to get started'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="table-header">
                  <TableHead>Name</TableHead>
                  <TableHead>Contact Person</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Payment Terms</TableHead>
                  <TableHead>Status</TableHead>
                  {canManageSuppliers && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((supplier) => (
                  <TableRow key={supplier._id || supplier.id}>
                    <TableCell className="font-medium">{supplier.name}</TableCell>
                    <TableCell>{supplier.contactPerson}</TableCell>
                    <TableCell>{supplier.mobile}</TableCell>
                    <TableCell>{supplier.email || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {supplier.paymentTerms?.replace('credit-', 'Credit ') || 'Cash'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={supplier.status === 'active' ? 'default' : 'secondary'}>
                        {supplier.status}
                      </Badge>
                    </TableCell>
                    {canManageSuppliers && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(supplier)}
                          >
                            <Edit size={16} />
                          </Button>
                          {canDeleteSuppliers && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDelete(supplier._id || supplier.id || '')}
                            >
                              <Trash2 size={16} />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
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

export default Suppliers;

