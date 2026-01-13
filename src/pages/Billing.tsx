import React, { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';
import { Medicine, Inventory } from '@/types/pharmacy';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ShoppingCart, Plus, Minus, Trash2, Loader2, Search, Barcode, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

interface CartItem {
  medicine: Medicine;
  inventory: Inventory;
  quantity: number;
  unitPrice: number;
}

const Billing: React.FC = () => {
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'esewa' | 'khalti' | 'mobile-payment' | 'credit'>('cash');
  const [lastInvoiceId, setLastInvoiceId] = useState<string | null>(null);
  const { userRole } = useAuth();

  const searchMedicines = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      // Try barcode search first if it looks like a barcode
      const isBarcode = /^[A-Z0-9]+$/i.test(query.trim()) && query.trim().length >= 3;
      
      const response = isBarcode
        ? await apiClient.searchMedicinesForBilling('', query.trim())
        : await apiClient.searchMedicinesForBilling(query.trim());
      
      if (response.success && response.data) {
        setSearchResults(response.data);
      } else {
        setSearchResults([]);
      }
    } catch (error: any) {
      console.error('Error searching medicines:', error);
      toast.error(error.message || 'Failed to search medicines');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleBarcodeSearch = async (barcode: string) => {
    if (!barcode.trim()) return;
    await searchMedicines(barcode.trim());
  };

  const addToCart = async (medicineData: any) => {
    // medicineData comes from searchMedicinesForBilling which includes batches
    if (!medicineData.hasStock || !medicineData.batches || medicineData.batches.length === 0) {
      toast.error('No available stock for this medicine');
      return;
    }

    // Use FEFO - first batch (earliest expiry)
    const selectedBatch = medicineData.batches[0];
    const medicine: Medicine = {
      _id: medicineData._id || medicineData.id,
      id: medicineData._id || medicineData.id,
      name: medicineData.name,
      genericName: medicineData.genericName,
      manufacturer: medicineData.manufacturer,
      category: medicineData.category,
      dosageForm: medicineData.dosageForm,
      strength: medicineData.strength,
      barcode: medicineData.barcode,
      prescriptionRequired: medicineData.prescriptionRequired,
      status: medicineData.status || 'active',
    };

    const inventoryItem: Inventory = {
      _id: selectedBatch.batchId,
      id: selectedBatch.batchId,
      medicine: medicine._id || medicine.id,
      batchNumber: selectedBatch.batchNumber,
      manufacturingDate: selectedBatch.manufacturingDate,
      expiryDate: selectedBatch.expiryDate,
      quantity: selectedBatch.quantity,
      purchasePrice: 0, // Not needed for cart
      sellingPrice: selectedBatch.sellingPrice,
      status: 'available',
    };

    const existingItem = cart.find(
      (item) => (item.medicine._id || item.medicine.id) === (medicine._id || medicine.id)
    );

    if (existingItem) {
      const totalRequested = existingItem.quantity + 1;
      const totalAvailable = medicineData.availableStock;
      
      if (totalRequested > totalAvailable) {
        toast.error(`Insufficient stock. Available: ${totalAvailable}`);
        return;
      }
      
      setCart(
        cart.map((item) =>
          (item.medicine._id || item.medicine.id) === (medicine._id || medicine.id)
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCart([
        ...cart,
        {
          medicine,
          inventory: inventoryItem,
          quantity: 1,
          unitPrice: selectedBatch.sellingPrice,
        },
      ]);
    }
  };

  const updateQuantity = async (medicineId: string, delta: number) => {
    const item = cart.find((item) => (item.medicine._id || item.medicine.id) === medicineId);
    if (!item) return;

    const newQuantity = item.quantity + delta;
    if (newQuantity <= 0) {
      removeFromCart(medicineId);
      return;
    }

    // Fetch current stock for this medicine
    try {
      const response = await apiClient.getMedicineBatches(medicineId);
      if (response.success && response.data) {
        const totalAvailable = response.data.batches.reduce(
          (sum: number, batch: any) => sum + batch.quantity,
          0
        );
        
        if (newQuantity > totalAvailable) {
          toast.error(`Insufficient stock. Available: ${totalAvailable}`);
          return;
        }
      }
    } catch (error) {
      console.error('Error checking stock:', error);
    }

    setCart(
      cart.map((item) =>
        (item.medicine._id || item.medicine.id) === medicineId
          ? { ...item, quantity: newQuantity }
          : item
      )
    );
  };

  const removeFromCart = (medicineId: string) => {
    setCart(cart.filter((item) => item.medicine._id !== medicineId && item.medicine.id !== medicineId));
  };

  const calculateTotals = () => {
    const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const discount = (subtotal * discountPercentage) / 100;
    const afterDiscount = subtotal - discount;
    const vatRate = 13; // Nepal VAT
    const vatAmount = (afterDiscount * vatRate) / 100;
    const total = afterDiscount + vatAmount;

    return { subtotal, discount, vatAmount, total };
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    setIsSubmitting(true);
    try {
      const { subtotal, discount, vatAmount, total } = calculateTotals();

      const saleData = {
        customerName: customerName || undefined,
        customerMobile: customerMobile || undefined,
        items: cart.map((item) => ({
          medicine: item.medicine._id || item.medicine.id,
          inventory: item.inventory._id || item.inventory.id,
          batchNumber: item.inventory.batchNumber,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.unitPrice * item.quantity,
        })),
        subtotal,
        discount,
        discountPercentage,
        vatRate: 13,
        vatAmount,
        totalAmount: total,
        paymentMethod,
        paymentStatus: 'paid',
        amountPaid: total,
        amountDue: 0,
      };

      const response = await apiClient.createSale(saleData);
      if (response.success && response.data) {
        const invoiceId = response.data._id || response.data.id;
        setLastInvoiceId(invoiceId);
        toast.success('Sale completed successfully!');
        setCart([]);
        setCustomerName('');
        setCustomerMobile('');
        setDiscountPercentage(0);
        setSearchQuery('');
        setSearchResults([]);
      } else {
        throw new Error(response.message || 'Failed to create sale');
      }
    } catch (error: any) {
      console.error('Error creating sale:', error);
      toast.error(error.message || 'Failed to complete sale');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      searchMedicines(searchQuery.trim());
    }
  };

  useEffect(() => {
    // Debounced search
    if (searchQuery === '') {
      setSearchResults([]);
      return;
    }
    
    const debounceTimer = setTimeout(() => {
      searchMedicines(searchQuery);
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const printInvoice = () => {
    if (!lastInvoiceId) {
      toast.error('No invoice to print');
      return;
    }
    // Open invoice in new window for printing
    window.open(`/invoice/${lastInvoiceId}`, '_blank');
  };

  const { subtotal, discount, vatAmount, total } = calculateTotals();

  const formatCurrency = (amount: number) => {
    return `रू ${amount.toLocaleString('en-NP', { minimumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Billing</h1>
        <p className="text-muted-foreground mt-1">Create new sales transactions</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Medicine Selection */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="pharmacy-card">
            <CardHeader>
              <CardTitle>Select Medicines</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative mb-4">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                  size={18}
                />
                <Input
                  placeholder="Search by name, generic name, or barcode (press Enter for barcode scan)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleSearchKeyPress}
                  className="pl-10"
                />
                <Barcode
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                  size={18}
                />
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : searchResults.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    {searchQuery ? 'No medicines found with available stock' : 'Start typing to search medicines...'}
                  </p>
                ) : (
                  searchResults.map((medicineData) => {
                    const medicine = medicineData;
                    const hasStock = medicine.hasStock && medicine.availableStock > 0;
                    const earliestBatch = medicine.batches?.[0];
                    
                    return (
                      <div
                        key={medicine._id || medicine.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{medicine.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {medicine.genericName}
                            {medicine.barcode && ` • Barcode: ${medicine.barcode}`}
                            {earliestBatch && ` • Price: ${formatCurrency(earliestBatch.sellingPrice)}`}
                          </p>
                          <div className="flex gap-2 mt-1">
                            {!hasStock && (
                              <Badge variant="destructive" className="text-xs">
                                Out of Stock
                              </Badge>
                            )}
                            {hasStock && (
                              <Badge variant="secondary" className="text-xs">
                                Stock: {medicine.availableStock}
                              </Badge>
                            )}
                            {earliestBatch && (
                              <Badge variant="outline" className="text-xs">
                                Exp: {format(new Date(earliestBatch.expiryDate), 'MMM yyyy')}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => addToCart(medicine)}
                          disabled={!hasStock}
                        >
                          <Plus size={16} className="mr-1" />
                          Add
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cart & Checkout */}
        <div className="space-y-4">
          <Card className="pharmacy-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart size={20} />
                Cart ({cart.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cart.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Cart is empty
                </p>
              ) : (
                <>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {cart.map((item) => (
                      <div
                        key={item.medicine._id || item.medicine.id}
                        className="p-3 border rounded-lg"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{item.medicine.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatCurrency(item.unitPrice)} × {item.quantity}
                            </p>
                            {item.inventory.batchNumber && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Batch: {item.inventory.batchNumber}
                                {item.inventory.expiryDate && 
                                  ` • Exp: ${format(new Date(item.inventory.expiryDate), 'MMM yyyy')}`
                                }
                              </p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => removeFromCart(item.medicine._id || item.medicine.id || '')}
                          >
                            <Trash2 size={12} />
                          </Button>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateQuantity(item.medicine._id || item.medicine.id || '', -1)}
                          >
                            <Minus size={12} />
                          </Button>
                          <span className="w-8 text-center text-sm font-medium">
                            {item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateQuantity(item.medicine._id || item.medicine.id || '', 1)}
                          >
                            <Plus size={12} />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2 pt-4 border-t">
                    <div className="space-y-2">
                      <Label>Customer Name (Optional)</Label>
                      <Input
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Customer name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Mobile (Optional)</Label>
                      <Input
                        value={customerMobile}
                        onChange={(e) => setCustomerMobile(e.target.value)}
                        placeholder="9841234567"
                        maxLength={10}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Discount (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={discountPercentage}
                        onChange={(e) => setDiscountPercentage(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Payment Method</Label>
                      <Select
                        value={paymentMethod}
                        onValueChange={(value: any) => setPaymentMethod(value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="card">Card</SelectItem>
                          <SelectItem value="esewa">eSewa</SelectItem>
                          <SelectItem value="khalti">Khalti</SelectItem>
                          <SelectItem value="mobile-payment">Other Mobile Payment</SelectItem>
                          <SelectItem value="credit">Credit</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2 pt-4 border-t">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Discount ({discountPercentage}%):</span>
                        <span>-{formatCurrency(discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span>VAT (13%):</span>
                      <span>{formatCurrency(vatAmount)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg pt-2 border-t">
                      <span>Total:</span>
                      <span>{formatCurrency(total)}</span>
                    </div>
                  </div>

                  <Button
                    className="w-full btn-pharmacy-primary"
                    onClick={handleCheckout}
                    disabled={isSubmitting || cart.length === 0}
                  >
                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Complete Sale
                  </Button>
                  
                  {lastInvoiceId && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={printInvoice}
                    >
                      <Printer size={16} className="mr-2" />
                      Print Invoice
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Billing;

