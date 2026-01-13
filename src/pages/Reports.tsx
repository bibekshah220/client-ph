import React, { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ClipboardList, Loader2, Download, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const Reports: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState<'daily' | 'monthly' | 'inventory' | 'expired' | 'profit'>('daily');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [startDate, setStartDate] = useState(format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [reportData, setReportData] = useState<any>(null);

  const fetchReport = async () => {
    try {
      setLoading(true);
      let response;

      switch (reportType) {
        case 'daily':
          response = await apiClient.getDailySalesReport(date);
          break;
        case 'monthly':
          const [year, monthNum] = month.split('-');
          response = await apiClient.getMonthlySalesReport(monthNum, year);
          break;
        case 'inventory':
          response = await apiClient.getInventoryValuation();
          break;
        case 'expired':
          response = await apiClient.getExpiredStockReport();
          break;
        case 'profit':
          if (!startDate || !endDate) {
            toast.error('Please select start date and end date');
            setLoading(false);
            return;
          }
          response = await apiClient.getProfitLossSummary(startDate, endDate);
          break;
        default:
          return;
      }

      if (response.success) {
        setReportData(response.data);
      } else {
        throw new Error(response.message || 'Failed to fetch report');
      }
    } catch (error: any) {
      console.error('Error fetching report:', error);
      toast.error(error.message || 'Failed to fetch report');
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (reportType === 'daily' || reportType === 'monthly') {
      fetchReport();
    }
  }, [reportType, date, month]);

  const formatCurrency = (amount: number) => {
    return `रू ${amount.toLocaleString('en-NP', { minimumFractionDigits: 2 })}`;
  };

  const renderReport = () => {
    if (!reportData) {
      return (
        <div className="text-center py-12">
          <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">No report data available</p>
        </div>
      );
    }

    switch (reportType) {
      case 'daily':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Total Invoices</div>
                  <div className="text-2xl font-bold">{reportData.totalInvoices || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Total Sales</div>
                  <div className="text-2xl font-bold">{formatCurrency(reportData.totalSales || 0)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Total VAT</div>
                  <div className="text-2xl font-bold">{formatCurrency(reportData.totalVAT || 0)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Net Sales</div>
                  <div className="text-2xl font-bold">{formatCurrency(reportData.netSales || 0)}</div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 'monthly':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Total Sales</div>
                  <div className="text-2xl font-bold">{formatCurrency(reportData.totalSales || 0)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Total VAT</div>
                  <div className="text-2xl font-bold">{formatCurrency(reportData.totalVAT || 0)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Total Discount</div>
                  <div className="text-2xl font-bold">{formatCurrency(reportData.totalDiscount || 0)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Net Sales</div>
                  <div className="text-2xl font-bold">{formatCurrency(reportData.netSales || 0)}</div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 'inventory':
        return (
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground mb-2">Total Inventory Value</div>
                <div className="text-3xl font-bold">{formatCurrency(reportData.totalValue || 0)}</div>
              </CardContent>
            </Card>
          </div>
        );

      case 'expired':
        return (
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground mb-2">Expired Items Count</div>
                <div className="text-3xl font-bold">{reportData.count || 0}</div>
              </CardContent>
            </Card>
          </div>
        );

      case 'profit':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Total Revenue</div>
                  <div className="text-2xl font-bold">{formatCurrency(reportData.totalRevenue || 0)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Total Cost</div>
                  <div className="text-2xl font-bold">{formatCurrency(reportData.totalCost || 0)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Gross Profit</div>
                  <div className={`text-2xl font-bold ${(reportData.grossProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(reportData.grossProfit || 0)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Profit Margin</div>
                  <div className="text-2xl font-bold">{reportData.profitMargin || '0%'}</div>
                </CardContent>
              </Card>
            </div>
            {reportData.totalInvoices !== undefined && (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Total Invoices</div>
                  <div className="text-2xl font-bold">{reportData.totalInvoices || 0}</div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Reports</h1>
        <p className="text-muted-foreground mt-1">View system reports and analytics</p>
      </div>

      <Card className="pharmacy-card">
        <CardHeader>
          <CardTitle>Select Report Type</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <Button
              variant={reportType === 'daily' ? 'default' : 'outline'}
              onClick={() => setReportType('daily')}
            >
              Daily Sales
            </Button>
            <Button
              variant={reportType === 'monthly' ? 'default' : 'outline'}
              onClick={() => setReportType('monthly')}
            >
              Monthly Sales
            </Button>
            <Button
              variant={reportType === 'inventory' ? 'default' : 'outline'}
              onClick={() => {
                setReportType('inventory');
                fetchReport();
              }}
            >
              Inventory
            </Button>
            <Button
              variant={reportType === 'expired' ? 'default' : 'outline'}
              onClick={() => {
                setReportType('expired');
                fetchReport();
              }}
            >
              Expired Stock
            </Button>
            <Button
              variant={reportType === 'profit' ? 'default' : 'outline'}
              onClick={() => setReportType('profit')}
            >
              Profit & Loss
            </Button>
          </div>

          {(reportType === 'daily' || reportType === 'monthly' || reportType === 'profit') && (
            <div className="flex gap-4 items-end">
              {reportType === 'daily' && (
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
              )}
              {reportType === 'monthly' && (
                <div className="space-y-2">
                  <Label htmlFor="month">Month</Label>
                  <Input
                    id="month"
                    type="month"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                  />
                </div>
              )}
              {reportType === 'profit' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date *</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">End Date *</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={startDate}
                      required
                    />
                  </div>
                </>
              )}
              <Button onClick={fetchReport} disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Generate
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="pharmacy-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Report Results</span>
            {reportData && (
              <Button variant="outline" size="sm">
                <Download size={16} className="mr-2" />
                Export
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            renderReport()
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;

