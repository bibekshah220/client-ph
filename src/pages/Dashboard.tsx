import React, { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DollarSign,
  Package,
  AlertTriangle,
  TrendingUp,
  Pill,
  Clock,
  ShoppingCart,
  Users,
  Phone,
  MapPin,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, isAfter, isBefore, addDays } from 'date-fns';
import { Sale, Inventory, Medicine } from '@/types/pharmacy';

const Dashboard: React.FC = () => {
  const { profile, userRole } = useAuth();
  const [todaySales, setTodaySales] = useState(0);
  const [monthSales, setMonthSales] = useState(0);
  const [lowStockItems, setLowStockItems] = useState<(Inventory & { medicine: Medicine })[]>([]);
  const [expiringItems, setExpiringItems] = useState<(Inventory & { medicine: Medicine })[]>([]);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [totalMedicines, setTotalMedicines] = useState(0);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [recentCustomers, setRecentCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const today = new Date();
      const startOfToday = format(today, 'yyyy-MM-dd');
      const monthStart = format(startOfMonth(today), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(today), 'yyyy-MM-dd');

      // Fetch today's sales
      const todaySalesResponse = await apiClient.getSales({
        startDate: startOfToday,
        endDate: startOfToday,
      });

      if (todaySalesResponse.success && todaySalesResponse.data) {
        const total = Array.isArray(todaySalesResponse.data)
          ? todaySalesResponse.data.reduce((sum: number, sale: any) => sum + (sale.totalAmount || 0), 0)
          : 0;
        setTodaySales(total);
      }

      // Fetch month's sales
      const monthSalesResponse = await apiClient.getSales({
        startDate: monthStart,
        endDate: monthEnd,
      });

      if (monthSalesResponse.success && monthSalesResponse.data) {
        const total = Array.isArray(monthSalesResponse.data)
          ? monthSalesResponse.data.reduce((sum: number, sale: any) => sum + (sale.totalAmount || 0), 0)
          : 0;
        setMonthSales(total);
      }

      // Fetch low stock items
      const lowStockResponse = await apiClient.getLowStock();
      if (lowStockResponse.success && lowStockResponse.data) {
        const lowStock = Array.isArray(lowStockResponse.data) ? lowStockResponse.data : [];
        setLowStockItems(lowStock.slice(0, 5));
      }

      // Fetch expiring items
      const expiringResponse = await apiClient.getNearingExpiry();
      if (expiringResponse.success && expiringResponse.data) {
        const expiring = Array.isArray(expiringResponse.data) ? expiringResponse.data : [];
        setExpiringItems(expiring.slice(0, 5));
      }

      // Fetch recent sales
      const recentSalesResponse = await apiClient.getSales({ limit: 5 });
      if (recentSalesResponse.success && recentSalesResponse.data) {
        const sales = Array.isArray(recentSalesResponse.data) ? recentSalesResponse.data : [];
        setRecentSales(sales as Sale[]);
      }

      // Fetch total medicines count
      const medicinesResponse = await apiClient.getMedicines({ limit: 1 });
      if (medicinesResponse.success && medicinesResponse.pagination) {
        setTotalMedicines(medicinesResponse.pagination.total || 0);
      }

      // Fetch customer data
      const customersResponse = await apiClient.getCustomers({ limit: 5 });
      if (customersResponse.success && customersResponse.data) {
        const customers = Array.isArray(customersResponse.data) ? customersResponse.data : [];
        setRecentCustomers(customers);
      }

      // Get total customer count
      const customersCountResponse = await apiClient.getCustomers({ limit: 1 });
      if (customersCountResponse.success && customersCountResponse.pagination) {
        setTotalCustomers(customersCountResponse.pagination.total || 0);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `रू ${amount.toLocaleString('en-NP', { minimumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Welcome back, {profile?.name?.split(' ')[0] || 'User'}
        </h1>
        <p className="text-muted-foreground mt-1">
          Here's what's happening with your pharmacy today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Today's Sales"
          value={formatCurrency(todaySales)}
          icon={DollarSign}
          variant="primary"
          subtitle="Total revenue today"
        />
        <StatCard
          title="Monthly Sales"
          value={formatCurrency(monthSales)}
          icon={TrendingUp}
          variant="success"
          subtitle={format(new Date(), 'MMMM yyyy')}
        />
        <StatCard
          title="Low Stock Items"
          value={lowStockItems.length}
          icon={Package}
          variant={lowStockItems.length > 0 ? 'danger' : 'default'}
          subtitle="Need reordering"
        />
        <StatCard
          title="Expiring Soon"
          value={expiringItems.length}
          icon={AlertTriangle}
          variant={expiringItems.length > 0 ? 'danger' : 'default'}
          subtitle="Within 30 days"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Sales */}
        <Card className="pharmacy-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <ShoppingCart size={20} className="text-primary" />
              Recent Sales
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentSales.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No sales recorded yet
              </p>
            ) : (
              <div className="space-y-4">
                {recentSales.map((sale) => (
                  <div
                    key={sale._id || sale.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-foreground">
                        {sale.invoiceNumber || 'N/A'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {sale.customerName || 'Walk-in Customer'} •{' '}
                        {format(new Date(sale.saleDate || sale.createdAt || new Date()), 'MMM dd, h:mm a')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">
                        {formatCurrency(Number(sale.totalAmount || 0))}
                      </p>
                      <Badge variant="outline" className="capitalize">
                        {sale.paymentMethod || 'cash'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Alerts */}
        <Card className={`pharmacy-card ${lowStockItems.length > 0 ? 'border-red-500 border-2 bg-red-50/50 dark:bg-red-950/20' : ''}`}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Package size={20} className={lowStockItems.length > 0 ? 'text-red-600' : 'text-warning'} />
              Low Stock Alerts
              {lowStockItems.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {lowStockItems.length} Alert{lowStockItems.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowStockItems.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                All items are well-stocked
              </p>
            ) : (
              <div className="space-y-4">
                {lowStockItems.map((item: any) => (
                  <div
                    key={item.medicine?._id || item.medicine?.id || Math.random()}
                    className="flex items-center justify-between p-3 rounded-lg bg-red-100 dark:bg-red-900/30 border-2 border-red-400"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-red-500 flex items-center justify-center">
                        <AlertTriangle size={18} className="text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {item.medicine?.name || 'Unknown Medicine'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Current Stock: {item.currentStock || 0}
                        </p>
                        {item.minimumStock && (
                          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                            Minimum Required: {item.minimumStock}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="destructive" className="text-sm">
                        {item.currentStock || 0} left
                      </Badge>
                      {item.deficit && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-semibold">
                          Need: {item.deficit} more
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expiring Soon */}
        <Card className={`pharmacy-card ${expiringItems.length > 0 ? 'border-red-500 border-2 bg-red-50/50 dark:bg-red-950/20' : ''}`}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Clock size={20} className={expiringItems.length > 0 ? 'text-red-600' : 'text-destructive'} />
              Expiring Soon
              {expiringItems.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {expiringItems.length} Alert{expiringItems.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {expiringItems.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No items expiring soon
              </p>
            ) : (
              <div className="space-y-4">
                {expiringItems.map((item: any) => {
                  const expiryDate = item.expiryDate ? new Date(item.expiryDate) : null;
                  const daysUntilExpiry = expiryDate 
                    ? Math.ceil((expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                    : null;
                  
                  return (
                    <div
                      key={item._id || item.id || Math.random()}
                      className="flex items-center justify-between p-3 rounded-lg bg-red-100 dark:bg-red-900/30 border-2 border-red-400"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-red-500 flex items-center justify-center">
                          <AlertTriangle size={18} className="text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {item.medicine?.name || 'Unknown Medicine'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Batch: {item.batchNumber || 'N/A'}
                          </p>
                          {daysUntilExpiry !== null && (
                            <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-semibold">
                              {daysUntilExpiry} day{daysUntilExpiry !== 1 ? 's' : ''} until expiry
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="destructive" className="text-sm">
                          {expiryDate ? format(expiryDate, 'MMM dd, yyyy') : 'N/A'}
                        </Badge>
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-semibold">
                          Qty: {item.quantity || 0}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Customer Details */}
        <Card className="pharmacy-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Users size={20} className="text-primary" />
              Customer Details
              <Badge variant="outline" className="ml-2">
                {totalCustomers} Total
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentCustomers.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No customer data available yet
              </p>
            ) : (
              <div className="space-y-4">
                {recentCustomers.map((customer, index) => (
                  <div
                    key={customer.mobile || customer.name || index}
                    className="flex items-start justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Users size={16} className="text-primary" />
                        <p className="font-medium text-foreground">
                          {customer.name || 'Unknown Customer'}
                        </p>
                      </div>
                      {customer.mobile && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                          <Phone size={14} />
                          <span>{customer.mobile}</span>
                        </div>
                      )}
                      {customer.address && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin size={14} />
                          <span className="truncate">
                            {typeof customer.address === 'string' 
                              ? customer.address 
                              : customer.address?.street || customer.address?.city || 'N/A'}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>{customer.totalPurchases || 0} purchase{(customer.totalPurchases || 0) !== 1 ? 's' : ''}</span>
                        <span>•</span>
                        <span>{formatCurrency(customer.totalSpent || 0)} total</span>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-xs text-muted-foreground">Last Visit</p>
                      <p className="text-sm font-medium">
                        {customer.lastPurchaseDate 
                          ? format(new Date(customer.lastPurchaseDate), 'MMM dd')
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card className="pharmacy-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Pill size={20} className="text-primary" />
              Inventory Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-3xl font-bold text-primary">{totalMedicines}</p>
                <p className="text-sm text-muted-foreground">Total Medicines</p>
              </div>
              <div className="p-4 rounded-lg bg-success/5 border border-success/20">
                <p className="text-3xl font-bold text-success">{recentSales.length}</p>
                <p className="text-sm text-muted-foreground">Sales Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
