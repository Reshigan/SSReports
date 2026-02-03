import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Users, Store, Calendar, TrendingUp, ChevronLeft, ChevronRight,
  Eye, CheckCircle, XCircle, UserCheck
} from 'lucide-react';
import { Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import PhotoModal from '@/components/PhotoModal';
import DateRangeFilter from '@/components/DateRangeFilter';

interface CustomersAnalyticsProps {
  apiUrl: string;
}

interface CustomerRecord {
  checkin_id: number;
  timestamp: string;
  latitude: number;
  longitude: number;
  agent_id: number;
  agent_name: string;
  shop_name: string;
  shop_id: number;
  responses: string;
  converted: number;
  already_betting: number;
}

interface CustomerDetail {
  checkin_id: number;
  timestamp: string;
  latitude: number;
  longitude: number;
  agent_id: number;
  agent_name: string;
  shop_name: string;
  shop_address: string;
  shop_id: number;
  responses: string;
  converted: number;
  already_betting: number;
  status: string;
  notes: string;
}

interface Stats {
  total_customers: number;
  converted: number;
  already_betting: number;
}

const COLORS = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6'];

export default function CustomersAnalytics({ apiUrl }: CustomersAnalyticsProps) {
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetail | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [photoModal, setPhotoModal] = useState<{ isOpen: boolean; url: string; title: string }>({
    isOpen: false,
    url: '',
    title: '',
  });
  const limit = 20;

  useEffect(() => {
    fetchCustomers();
  }, [page]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      let url = `${apiUrl}/api/customers-analytics?page=${page}&limit=${limit}`;
      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;
      const res = await fetch(url);
      const data = await res.json();
      setCustomers(data.customers || []);
      setTotal(data.total || 0);
      setStats(data.stats);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateFilter = () => {
    setPage(1);
    fetchCustomers();
  };

  const handleClearFilter = () => {
    setPage(1);
    fetchCustomers();
  };

  const openPhotoModal = (checkinId: number, title: string) => {
    setPhotoModal({
      isOpen: true,
      url: `${apiUrl}/api/photos/${checkinId}`,
      title,
    });
  };

  const fetchCustomerDetail = async (checkinId: number) => {
    try {
      const res = await fetch(`${apiUrl}/api/customer/${checkinId}`);
      const data = await res.json();
      setSelectedCustomer(data.customer);
      setShowDetail(true);
    } catch (error) {
      console.error('Failed to fetch customer detail:', error);
    }
  };

  const parseResponses = (responses: string): Record<string, string> => {
    try {
      return JSON.parse(responses || '{}');
    } catch {
      return {};
    }
  };

  const totalPages = Math.ceil(total / limit);

  const filteredCustomers = customers.filter(customer => 
    customer.shop_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.agent_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const conversionData = [
    { name: 'Converted', value: stats?.converted || 0 },
    { name: 'Not Converted', value: (stats?.total_customers || 0) - (stats?.converted || 0) }
  ];

  const bettingData = [
    { name: 'Already Betting', value: stats?.already_betting || 0 },
    { name: 'New to Betting', value: (stats?.total_customers || 0) - (stats?.already_betting || 0) }
  ];

  const conversionRate = stats && stats.total_customers > 0 
    ? ((stats.converted / stats.total_customers) * 100).toFixed(1) 
    : '0';

  if (loading && customers.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Customer Analytics</h1>
          <p className="text-slate-500 mt-1">Individual customer interaction analysis</p>
        </div>
      </div>

      <DateRangeFilter
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onApply={handleDateFilter}
        onClear={handleClearFilter}
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Total Customers</p>
                <p className="text-3xl font-bold mt-1">{stats?.total_customers?.toLocaleString() || 0}</p>
              </div>
              <Users className="h-10 w-10 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm">Converted</p>
                <p className="text-3xl font-bold mt-1">{stats?.converted?.toLocaleString() || 0}</p>
              </div>
              <UserCheck className="h-10 w-10 text-emerald-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Conversion Rate</p>
                <p className="text-3xl font-bold mt-1">{conversionRate}%</p>
              </div>
              <TrendingUp className="h-10 w-10 text-purple-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-100 text-sm">New to Betting</p>
                <p className="text-3xl font-bold mt-1">
                  {((stats?.total_customers || 0) - (stats?.already_betting || 0)).toLocaleString()}
                </p>
              </div>
              <CheckCircle className="h-10 w-10 text-amber-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              Conversion Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={conversionData}
                  cx="50%"
                  cy="40%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {conversionData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => value.toLocaleString()} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Betting Experience
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={bettingData}
                  cx="50%"
                  cy="40%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {bettingData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => value.toLocaleString()} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-slate-600" />
              Customer Records
            </CardTitle>
            <Input
              placeholder="Search by shop or agent..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Shop</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead className="text-center">Converted</TableHead>
                <TableHead className="text-center">Already Betting</TableHead>
                <TableHead className="text-center">Photo</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((customer) => (
                <TableRow key={customer.checkin_id}>
                  <TableCell className="text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      {new Date(customer.timestamp).toLocaleDateString()}
                    </div>
                    <span className="text-xs text-slate-400">
                      {new Date(customer.timestamp).toLocaleTimeString()}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Store className="h-4 w-4 text-slate-400" />
                      <span className="font-medium">{customer.shop_name || `Shop #${customer.shop_id}`}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {customer.agent_name || `Agent ${customer.agent_id}`}
                  </TableCell>
                  <TableCell className="text-center">
                    {customer.converted === 1 ? (
                      <Badge className="bg-emerald-100 text-emerald-700">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Yes
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <XCircle className="h-3 w-3 mr-1" />
                        No
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {customer.already_betting === 1 ? (
                      <Badge className="bg-blue-100 text-blue-700">Yes</Badge>
                    ) : (
                      <Badge className="bg-amber-100 text-amber-700">New</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <img 
                      src={`${apiUrl}/api/photos/${customer.checkin_id}`}
                      alt="Customer photo"
                      loading="lazy"
                      width={40}
                      height={40}
                      className="h-10 w-10 object-cover rounded cursor-pointer hover:opacity-80 inline-block bg-slate-100"
                      onClick={() => openPhotoModal(customer.checkin_id, `${customer.shop_name || 'Shop'} - ${new Date(customer.timestamp).toLocaleDateString()}`)}
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => fetchCustomerDetail(customer.checkin_id)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-slate-500">
              Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} customers
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-3 py-1 text-sm">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Customer Interaction Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedCustomer && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-slate-500">Shop</p>
                    <p className="font-semibold">{selectedCustomer.shop_name || 'Unknown'}</p>
                    <p className="text-xs text-slate-400">{selectedCustomer.shop_address}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-slate-500">Agent</p>
                    <p className="font-semibold">{selectedCustomer.agent_name || `Agent ${selectedCustomer.agent_id}`}</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className={`text-2xl font-bold ${selectedCustomer.converted === 1 ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {selectedCustomer.converted === 1 ? 'Yes' : 'No'}
                    </div>
                    <p className="text-sm text-slate-500">Converted</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className={`text-2xl font-bold ${selectedCustomer.already_betting === 1 ? 'text-blue-600' : 'text-amber-600'}`}>
                      {selectedCustomer.already_betting === 1 ? 'Yes' : 'No'}
                    </div>
                    <p className="text-sm text-slate-500">Already Betting</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-slate-600">
                      {new Date(selectedCustomer.timestamp).toLocaleDateString()}
                    </div>
                    <p className="text-sm text-slate-500">Visit Date</p>
                  </CardContent>
                </Card>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Photo Proof</h4>
                <img 
                  src={`${apiUrl}/api/photos/${selectedCustomer.checkin_id}`}
                  alt="Photo evidence"
                  loading="lazy"
                  className="max-w-full max-h-96 w-auto h-auto rounded-lg shadow-md object-contain bg-slate-100 cursor-pointer hover:opacity-80"
                  onClick={() => openPhotoModal(selectedCustomer.checkin_id, `${selectedCustomer.shop_name || 'Shop'} - ${new Date(selectedCustomer.timestamp).toLocaleDateString()}`)}
                  onError={(e) => { e.currentTarget.parentElement!.style.display = 'none'; }}
                />
              </div>

              {selectedCustomer.responses && (
                <div>
                  <h4 className="font-semibold mb-2">Survey Responses</h4>
                  <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                    {Object.entries(parseResponses(selectedCustomer.responses)).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="text-slate-600">{key}:</span>
                        <span className="font-medium">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedCustomer.notes && (
                <div>
                  <h4 className="font-semibold mb-2">Notes</h4>
                  <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-4">
                    {selectedCustomer.notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <PhotoModal
        isOpen={photoModal.isOpen}
        onClose={() => setPhotoModal({ isOpen: false, url: '', title: '' })}
        photoUrl={photoModal.url}
        title={photoModal.title}
      />
    </div>
  );
}
