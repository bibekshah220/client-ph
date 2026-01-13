import React, { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';
import { Inventory, Medicine } from '@/types/pharmacy';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Package, AlertTriangle, Calendar, Loader2, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const Inventory: React.FC = () => {
  const { hasRole, userRole } = useAuth();
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const canManageInventory = hasRole('admin') || hasRole('manager') || hasRole('pharmacist');
  
  // Block cashier from accessing inventory
  if (userRole === 'cashier') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground">Cashiers cannot access inventory management.</p>
        </div>
      </div>
    );
  }

  const [formData, setFormData] = useState({
    medicine: '',
    batchNumber: '',
    manufacturingDate: '',
    expiryDate: '',
    quantity: '',
    purchasePrice: '',
    sellingPrice: '',
    supplier: '',
  });

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getInventory();
      if (response.success && response.data) {
        const mappedInventory = response.data.map((item: any) => ({
          ...item,
          id: item._id || item.id,
        }));
        setInventory(mappedInventory);
      }
    } catch (error: any) {
      console.error('Error fetching inventory:', error);
      toast.error(error.message || 'Failed to fetch inventory');
      setInventory([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMedicines = async () => {
    try {
      const response = await apiClient.getMedicines({ status: 'active' });
      if (response.success && response.data) {
        const medicinesData = Array.isArray(response.data) 
          ? response.data 
          : (response.data?.data || []);
        const mapped = medicinesData.map((med: any) => ({
          ...med,
          id: med._id || med.id,
        }));
        setMedicines(mapped);
      }
    } catch (error: any) {
      console.error('Error fetching medicines:', error);
    }
  };

  useEffect(() => {
    fetchInventory();
    fetchMedicines();
  }, []);

  const resetForm = () => {
    setFormData({
      medicine: '',
      batchNumber: '',
      manufacturingDate: '',
      expiryDate: '',
      quantity: '',
      purchasePrice: '',
      sellingPrice: '',
      supplier: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.medicine) {
      toast.error('Please select a medicine');
      return;
    }

    setIsSubmitting(true);
    try {
      const inventoryData = {
        medicine: formData.medicine,
        batchNumber: formData.batchNumber,
        manufacturingDate: new Date(formData.manufacturingDate).toISOString(),
        expiryDate: new Date(formData.expiryDate).toISOString(),
        quantity: parseInt(formData.quantity),
        purchasePrice: parseFloat(formData.purchasePrice),
        sellingPrice: parseFloat(formData.sellingPrice),
        ...(formData.supplier && { supplier: formData.supplier }),
      };

      const response = await apiClient.addInventory(inventoryData);
      if (response.success) {
        toast.success('Inventory added successfully');
        setIsDialogOpen(false);
        resetForm();
        fetchInventory();
      } else {
        throw new Error(response.message || 'Failed to add inventory');
      }
    } catch (error: any) {
      console.error('Error adding inventory:', error);
      toast.error(error.message || 'Failed to add inventory');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredInventory = inventory.filter((item) => {
    if (!searchQuery) return true;
    const medicine = item.medicine as Medicine;
    const searchLower = searchQuery.toLowerCase();
    return (
      medicine?.name?.toLowerCase().includes(searchLower) ||
      item.batchNumber?.toLowerCase().includes(searchLower) ||
      medicine?.genericName?.toLowerCase().includes(searchLower)
    );
  });

  const formatCurrency = (amount: number) => {
    return `रू ${amount.toLocaleString('en-NP', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (date: string) => {
    try {
      return format(new Date(date), 'MMM dd, yyyy');
    } catch {
      return date;
    }
  };

  const getStatusBadge = (status: string, expiryDate: string) => {
    const isExpired = new Date(expiryDate) < new Date();
    
    if (isExpired) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    
    switch (status) {
      case 'available':
        return <Badge variant="default">Available</Badge>;
      case 'sold-out':
        return <Badge variant="secondary">Sold Out</Badge>;
      case 'damaged':
        return <Badge variant="outline">Damaged</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Inventory</h1>
          <p className="text-muted-foreground mt-1">
            Manage your medicine inventory and stock levels
          </p>
        </div>
        {canManageInventory && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="btn-pharmacy-primary" onClick={resetForm}>
                <Plus size={18} className="mr-2" />
                Add Inventory
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>Add New Inventory</DialogTitle>
                  <DialogDescription>
                    Add stock for a medicine. This will make it available for sale.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="medicine">Medicine *</Label>
                    <Select
                      value={formData.medicine}
                      onValueChange={(value) => setFormData({ ...formData, medicine: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a medicine" />
                      </SelectTrigger>
                      <SelectContent>
                        {medicines.map((med) => (
                          <SelectItem key={med._id || med.id} value={med._id || med.id || ''}>
                            {med.name} {med.genericName && `(${med.genericName})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="batchNumber">Batch Number *</Label>
                    <Input
                      id="batchNumber"
                      value={formData.batchNumber}
                      onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                      placeholder="BATCH001"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="manufacturingDate">Manufacturing Date *</Label>
                      <Input
                        id="manufacturingDate"
                        type="date"
                        value={formData.manufacturingDate}
                        onChange={(e) => setFormData({ ...formData, manufacturingDate: e.target.value })}
                        required
                        max={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expiryDate">Expiry Date *</Label>
                      <Input
                        id="expiryDate"
                        type="date"
                        value={formData.expiryDate}
                        onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                        required
                        min={formData.manufacturingDate || new Date().toISOString().split('T')[0]}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity *</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      placeholder="100"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="purchasePrice">Purchase Price (रू) *</Label>
                      <Input
                        id="purchasePrice"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.purchasePrice}
                        onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                        placeholder="20.00"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="sellingPrice">Selling Price (रू) *</Label>
                      <Input
                        id="sellingPrice"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.sellingPrice}
                        onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                        placeholder="25.50"
                        required
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="btn-pharmacy-primary" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Add Inventory
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
            <Package
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
              size={18}
            />
            <Input
              placeholder="Search by medicine name, generic name, or batch number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Inventory Table */}
      <Card className="pharmacy-card">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredInventory.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium text-muted-foreground">
                No inventory items found
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {searchQuery
                  ? 'Try adjusting your search'
                  : canManageInventory
                  ? 'Click "Add Inventory" to add stock for your medicines'
                  : 'Inventory items will appear here once added'}
              </p>
              {!searchQuery && canManageInventory && (
                <Button
                  className="mt-4 btn-pharmacy-primary"
                  onClick={() => setIsDialogOpen(true)}
                >
                  <Plus size={18} className="mr-2" />
                  Add Your First Inventory Item
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="table-header">
                  <TableHead>Medicine</TableHead>
                  <TableHead>Batch Number</TableHead>
                  <TableHead>Manufacturing Date</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead className="text-right">Purchase Price</TableHead>
                  <TableHead className="text-right">Selling Price</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInventory.map((item) => {
                  const medicine = item.medicine as Medicine;
                  return (
                    <TableRow key={item._id || item.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{medicine?.name || 'N/A'}</p>
                          {medicine?.genericName && (
                            <p className="text-sm text-muted-foreground">
                              {medicine.genericName}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-sm bg-muted px-2 py-1 rounded">
                          {item.batchNumber}
                        </code>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-muted-foreground" />
                          <span>{item.manufacturingDate ? formatDate(item.manufacturingDate) : 'N/A'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-muted-foreground" />
                          <span>{formatDate(item.expiryDate)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{item.quantity}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.purchasePrice)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.sellingPrice)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(item.status, item.expiryDate)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Inventory;

