import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiClient } from '@/lib/api';
import { Sale } from '@/types/pharmacy';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const Invoice: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchInvoice();
    }
  }, [id]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getSale(id!);
      if (response.success && response.data) {
        const mappedSale = {
          ...response.data,
          id: response.data._id || response.data.id,
        };
        setSale(mappedSale as Sale);
      } else {
        toast.error('Invoice not found');
      }
    } catch (error: any) {
      console.error('Error fetching invoice:', error);
      toast.error(error.message || 'Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (amount: number) => {
    return `रू ${amount.toLocaleString('en-NP', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (date: string | Date) => {
    try {
      return format(new Date(date), 'MMM dd, yyyy HH:mm');
    } catch {
      return String(date);
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: 'Cash',
      card: 'Card',
      esewa: 'eSewa',
      khalti: 'Khalti',
      'mobile-payment': 'Mobile Payment',
      credit: 'Credit',
    };
    return labels[method] || method.toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Invoice Not Found</h1>
          <p className="text-muted-foreground">The requested invoice could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 print:p-4">
      {/* Print Button - Hidden when printing */}
      <div className="mb-4 print:hidden">
        <Button onClick={handlePrint} className="btn-pharmacy-primary">
          <Printer size={16} className="mr-2" />
          Print Invoice
        </Button>
      </div>

      {/* Invoice Content */}
      <Card className="pharmacy-card print:border-none print:shadow-none">
        <CardContent className="p-8 print:p-6">
          {/* Header */}
          <div className="mb-8 border-b pb-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold mb-2">
                  {sale.pharmacyName || 'Pharmacy Invoice'}
                </h1>
                {sale.pharmacyPAN && (
                  <p className="text-sm text-muted-foreground">PAN: {sale.pharmacyPAN}</p>
                )}
                {sale.pharmacyAddress && (
                  <p className="text-sm text-muted-foreground">{sale.pharmacyAddress}</p>
                )}
                {sale.pharmacyPhone && (
                  <p className="text-sm text-muted-foreground">Phone: {sale.pharmacyPhone}</p>
                )}
                <p className="text-muted-foreground mt-2">Invoice Number: {sale.invoiceNumber}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Date</p>
                <p className="font-medium">{formatDate(sale.saleDate)}</p>
              </div>
            </div>
          </div>

          {/* Customer Information */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">Customer Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{sale.customerName || 'Walk-in Customer'}</p>
              </div>
              {sale.customerMobile && (
                <div>
                  <p className="text-sm text-muted-foreground">Mobile</p>
                  <p className="font-medium">{sale.customerMobile}</p>
                </div>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">Items</h2>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-3 font-semibold">Item</th>
                    <th className="text-center p-3 font-semibold">Batch</th>
                    <th className="text-center p-3 font-semibold">Mfg. Date</th>
                    <th className="text-center p-3 font-semibold">Exp. Date</th>
                    <th className="text-right p-3 font-semibold">Qty</th>
                    <th className="text-right p-3 font-semibold">Unit Price</th>
                    <th className="text-right p-3 font-semibold">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {sale.items?.map((item, index) => (
                    <tr key={index} className="border-t">
                      <td className="p-3">
                        <p className="font-medium">
                          {typeof item.medicine === 'object' && item.medicine?.name
                            ? item.medicine.name
                            : 'Medicine'}
                        </p>
                        {typeof item.medicine === 'object' && item.medicine?.genericName && (
                          <p className="text-sm text-muted-foreground">
                            {item.medicine.genericName}
                          </p>
                        )}
                      </td>
                      <td className="p-3 text-center text-sm">
                        {item.batchNumber || 'N/A'}
                      </td>
                      <td className="p-3 text-center text-sm">
                        {item.manufacturingDate ? formatDate(item.manufacturingDate) : 'N/A'}
                      </td>
                      <td className="p-3 text-center text-sm">
                        {item.expiryDate ? formatDate(item.expiryDate) : 'N/A'}
                      </td>
                      <td className="p-3 text-right">{item.quantity}</td>
                      <td className="p-3 text-right">{formatCurrency(item.unitPrice)}</td>
                      <td className="p-3 text-right font-medium">
                        {formatCurrency(item.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="mb-6">
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-medium">{formatCurrency(sale.subtotal)}</span>
                </div>
                {sale.discount > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Discount ({sale.discountPercentage}%):</span>
                    <span>-{formatCurrency(sale.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">VAT (13%):</span>
                  <span className="font-medium">{formatCurrency(sale.vatAmount)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Total:</span>
                  <span>{formatCurrency(sale.totalAmount)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Information */}
          <div className="mb-6 pt-6 border-t">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Payment Method</p>
                <Badge className="mt-1">{getPaymentMethodLabel(sale.paymentMethod)}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge
                  variant={
                    sale.status === 'completed'
                      ? 'default'
                      : sale.status === 'refunded'
                      ? 'destructive'
                      : 'secondary'
                  }
                  className="mt-1"
                >
                  {sale.status}
                </Badge>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t text-center text-sm text-muted-foreground">
            <p>Thank you for your purchase!</p>
            <p className="mt-2">This is a computer-generated invoice.</p>
          </div>
        </CardContent>
      </Card>

      {/* Print Styles */}
      <style>{`
        @media print {
          body {
            background: white;
          }
          .print\\:hidden {
            display: none;
          }
          .print\\:border-none {
            border: none;
          }
          .print\\:shadow-none {
            box-shadow: none;
          }
          .print\\:p-6 {
            padding: 1.5rem;
          }
          .print\\:p-4 {
            padding: 1rem;
          }
        }
      `}</style>
    </div>
  );
};

export default Invoice;

