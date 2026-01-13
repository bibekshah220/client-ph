import React, { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';
import { Sale, Medicine } from '@/types/pharmacy';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Receipt, Search, Loader2, Calendar, Printer, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

const SalesHistory: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { userRole } = useAuth();

  const fetchSales = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getSales();
      if (response.success && response.data) {
        const mappedSales = response.data.map((sale: any) => ({
          ...sale,
          id: sale._id || sale.id,
        }));
        setSales(mappedSales);
      }
    } catch (error: any) {
      console.error('Error fetching sales:', error);
      toast.error(error.message || 'Failed to fetch sales');
      setSales([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, []);

  const filteredSales = sales.filter((sale) => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      sale.invoiceNumber?.toLowerCase().includes(searchLower) ||
      sale.customerName?.toLowerCase().includes(searchLower) ||
      sale.customerMobile?.toLowerCase().includes(searchLower)
    );
  });

  const formatCurrency = (amount: number) => {
    return `रू ${amount.toLocaleString('en-NP', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (date: string) => {
    try {
      return format(new Date(date), 'MMM dd, yyyy HH:mm');
    } catch {
      return date;
    }
  };

  const getPaymentMethodBadge = (method: string) => {
    const variants: Record<string, any> = {
      cash: 'default',
      card: 'secondary',
      esewa: 'outline',
      khalti: 'outline',
      'mobile-payment': 'outline',
      credit: 'destructive',
    };
    const labels: Record<string, string> = {
      esewa: 'eSewa',
      khalti: 'Khalti',
      'mobile-payment': 'Mobile',
    };
    return (
      <Badge variant={variants[method] || 'outline'}>
        {labels[method] || method.toUpperCase()}
      </Badge>
    );
  };

  const viewInvoice = (invoiceId: string) => {
    window.open(`/invoice/${invoiceId}`, '_blank');
  };

  const printInvoice = (invoiceId: string) => {
    const printWindow = window.open(`/invoice/${invoiceId}`, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Sales History</h1>
        <p className="text-muted-foreground mt-1">
          {userRole === 'cashier' 
            ? 'View your sales transactions and invoices'
            : 'View all sales transactions and invoices'}
        </p>
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
              placeholder="Search by invoice number, customer name, or mobile..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Sales Table */}
      <Card className="pharmacy-card">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredSales.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium text-muted-foreground">
                No sales found
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {searchQuery
                  ? 'Try adjusting your search'
                  : 'Sales will appear here once transactions are made'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="table-header">
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Customer</TableHead>
                  {userRole !== 'cashier' && <TableHead>Cashier</TableHead>}
                  <TableHead>Date</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead className="text-right">VAT</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.map((sale) => (
                  <TableRow key={sale._id || sale.id}>
                    <TableCell>
                      <code className="text-sm bg-muted px-2 py-1 rounded font-medium">
                        {sale.invoiceNumber}
                      </code>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {sale.customerName || 'Walk-in Customer'}
                        </p>
                        {sale.customerMobile && (
                          <p className="text-sm text-muted-foreground">
                            {sale.customerMobile}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    {userRole !== 'cashier' && (
                      <TableCell>
                        <span className="text-sm">
                          {typeof sale.cashier === 'object' && sale.cashier?.name
                            ? sale.cashier.name
                            : 'N/A'}
                        </span>
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-muted-foreground" />
                        <span className="text-sm">{formatDate(sale.saleDate)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {sale.items?.length || 0} item(s)
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(sale.subtotal)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(sale.vatAmount)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(sale.totalAmount)}
                    </TableCell>
                    <TableCell>
                      {getPaymentMethodBadge(sale.paymentMethod)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          sale.status === 'completed'
                            ? 'default'
                            : sale.status === 'refunded'
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {sale.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => viewInvoice(sale._id || sale.id || '')}
                          title="View Invoice"
                        >
                          <Eye size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => printInvoice(sale._id || sale.id || '')}
                          title="Print Invoice"
                        >
                          <Printer size={14} />
                        </Button>
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

export default SalesHistory;

