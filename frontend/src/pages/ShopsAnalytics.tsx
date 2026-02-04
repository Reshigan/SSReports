import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
  Store, MapPin, Calendar, TrendingUp, ChevronLeft, ChevronRight,
  Eye, CheckCircle, Users
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import PhotoModal from '@/components/PhotoModal';
import DateRangeFilter from '@/components/DateRangeFilter';

interface ShopsAnalyticsProps {
  apiUrl: string;
}

interface ShopAnalytics {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  total_checkins: number;
  approved_checkins: number;
  conversions: number;
  last_visit: string;
  latest_checkin_id: number | null;
}

interface ShopDetail {
  shop: {
    id: number;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
  };
  checkins: Array<{
    id: number;
    timestamp: string;
    status: string;
    agent_id: number;
    converted: number;
    already_betting: number;
    responses: string;
  }>;
  stats: {
    total_checkins: number;
    approved: number;
    conversions: number;
  };
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function ShopsAnalytics({ apiUrl }: ShopsAnalyticsProps) {
  const [shops, setShops] = useState<ShopAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedShop, setSelectedShop] = useState<ShopDetail | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [photoModal, setPhotoModal] = useState<{ isOpen: boolean; url: string; title: string }>({
    isOpen: false,
    url: '',
    title: '',
  });
  const limit = 15;

  useEffect(() => {
    fetchShops();
  }, [page]);

  const fetchShops = async () => {
    setLoading(true);
    try {
      let url = `${apiUrl}/api/shops-analytics?page=${page}&limit=${limit}`;
      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;
      const res = await fetch(url);
      const data = await res.json();
      setShops(data.shops || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Failed to fetch shops:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateFilter = () => {
    setPage(1);
    fetchShops();
  };

  const handleClearFilter = () => {
    setPage(1);
    fetchShops();
  };

  const openPhotoModal = (checkinId: number, title: string) => {
    setPhotoModal({
      isOpen: true,
      url: `${apiUrl}/api/photos/${checkinId}`,
      title,
    });
  };

  const fetchShopDetail = async (shopId: number) => {
    try {
      const res = await fetch(`${apiUrl}/api/shops/${shopId}`);
      const data = await res.json();
      setSelectedShop(data);
      setShowDetail(true);
    } catch (error) {
      console.error('Failed to fetch shop detail:', error);
    }
  };

  const totalPages = Math.ceil(total / limit);

  const filteredShops = shops.filter(shop => 
    shop.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    shop.address?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const topShopsData = shops.slice(0, 10).map(shop => ({
    name: shop.name?.substring(0, 15) || `Shop ${shop.id}`,
    checkins: shop.total_checkins,
    conversions: shop.conversions
  }));

  const conversionData = shops.reduce((acc, shop) => {
    acc.converted += shop.conversions || 0;
    acc.notConverted += (shop.total_checkins || 0) - (shop.conversions || 0);
    return acc;
  }, { converted: 0, notConverted: 0 });

  const pieData = [
    { name: 'Converted', value: conversionData.converted },
    { name: 'Not Converted', value: conversionData.notConverted }
  ];

  if (loading && shops.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Shop Analytics</h1>
          <p className="text-slate-500 mt-1">Performance analysis by shop location</p>
        </div>
      </div>

      <div className="glass-card-solid rounded-2xl p-4">
        <DateRangeFilter
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onApply={handleDateFilter}
          onClear={handleClearFilter}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="kpi-card kpi-card-blue">
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-slate-500 text-sm font-medium">Total Shops</p>
              <p className="text-3xl font-bold text-slate-800 mt-1">{total.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Store className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="kpi-card kpi-card-blue">
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-slate-500 text-sm font-medium">Total Visits</p>
              <p className="text-3xl font-bold text-slate-800 mt-1">
                {shops.reduce((sum, s) => sum + (s.total_checkins || 0), 0).toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="kpi-card kpi-card-purple">
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-slate-500 text-sm font-medium">Total Conversions</p>
              <p className="text-3xl font-bold text-slate-800 mt-1">
                {shops.reduce((sum, s) => sum + (s.conversions || 0), 0).toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="kpi-card kpi-card-amber">
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-slate-500 text-sm font-medium">Avg Visits/Shop</p>
              <p className="text-3xl font-bold text-slate-800 mt-1">
                {shops.length > 0 
                  ? Math.round(shops.reduce((sum, s) => sum + (s.total_checkins || 0), 0) / shops.length)
                  : 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-amber-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="chart-container">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Store className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800">Top Performing Shops</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topShopsData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" stroke="#94a3b8" />
              <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <Tooltip contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
              <Bar dataKey="checkins" name="Visits" fill="#10b981" radius={[0, 8, 8, 0]} />
              <Bar dataKey="conversions" name="Conversions" fill="#3b82f6" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800">Conversion Rate by Shop</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="40%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {pieData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => value.toLocaleString()}
                contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
              />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass-card-solid rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
              <Store className="h-4 w-4 text-slate-600" />
            </div>
            <h3 className="font-semibold text-slate-800">All Shops</h3>
          </div>
          <Input
            placeholder="Search shops..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64 glass-input"
          />
        </div>
        <div className="p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shop Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead className="text-center">Visits</TableHead>
                <TableHead className="text-center">Conversions</TableHead>
                <TableHead className="text-center">Conv. Rate</TableHead>
                <TableHead>Last Visit</TableHead>
                <TableHead className="text-center">Photo</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredShops.map((shop) => (
                <TableRow key={shop.id}>
                  <TableCell className="font-medium">{shop.name || `Shop #${shop.id}`}</TableCell>
                  <TableCell className="text-slate-500 text-sm max-w-xs truncate">
                    {shop.address || '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{shop.total_checkins || 0}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className="bg-blue-100 text-blue-700">{shop.conversions || 0}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`font-semibold ${
                      shop.total_checkins > 0 && (shop.conversions / shop.total_checkins) > 0.5 
                        ? 'text-blue-600' 
                        : 'text-amber-600'
                    }`}>
                      {shop.total_checkins > 0 
                        ? ((shop.conversions / shop.total_checkins) * 100).toFixed(1) 
                        : 0}%
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-slate-500">
                    {shop.last_visit 
                      ? new Date(shop.last_visit).toLocaleDateString() 
                      : '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    {shop.latest_checkin_id ? (
                      <img 
                        src={`${apiUrl}/api/photos/${shop.latest_checkin_id}`}
                        alt="Shop photo"
                        loading="lazy"
                        width={40}
                        height={40}
                        className="h-10 w-10 object-cover rounded cursor-pointer hover:opacity-80 inline-block bg-slate-100"
                        onClick={() => openPhotoModal(shop.latest_checkin_id!, shop.name || `Shop #${shop.id}`)}
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => fetchShopDetail(shop.id)}
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
              Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} shops
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
        </div>
      </div>

      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              {selectedShop?.shop?.name || 'Shop Details'}
            </DialogTitle>
          </DialogHeader>
          
          {selectedShop && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-blue-600">
                      {selectedShop.stats?.total_checkins || 0}
                    </p>
                    <p className="text-sm text-slate-500">Total Visits</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-blue-600">
                      {selectedShop.stats?.approved || 0}
                    </p>
                    <p className="text-sm text-slate-500">Approved</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-purple-600">
                      {selectedShop.stats?.conversions || 0}
                    </p>
                    <p className="text-sm text-slate-500">Conversions</p>
                  </CardContent>
                </Card>
              </div>

              <div className="flex items-center gap-2 text-sm text-slate-500">
                <MapPin className="h-4 w-4" />
                {selectedShop.shop?.address || 'No address'}
                {selectedShop.shop?.latitude && selectedShop.shop?.longitude && (
                  <span className="ml-2">
                    ({selectedShop.shop.latitude.toFixed(4)}, {selectedShop.shop.longitude.toFixed(4)})
                  </span>
                )}
              </div>

              <div>
                <h4 className="font-semibold mb-3">All Photos ({selectedShop.checkins?.length || 0} visits)</h4>
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-6">
                  {selectedShop.checkins?.map((checkin) => (
                    <div key={checkin.id} className="relative group">
                      <img 
                        src={`${apiUrl}/api/photos/${checkin.id}`}
                        alt="Checkin photo"
                        loading="lazy"
                        className="w-full h-24 object-cover rounded-lg bg-slate-100 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => openPhotoModal(checkin.id, `${selectedShop?.shop?.name || 'Shop'} - ${new Date(checkin.timestamp).toLocaleDateString()}`)}
                        onError={(e) => { e.currentTarget.parentElement!.style.display = 'none'; }}
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity">
                        {new Date(checkin.timestamp).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3">Visit Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedShop.checkins?.slice(0, 10).map((checkin) => (
                    <Card key={checkin.id} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="h-4 w-4 text-slate-400" />
                              {new Date(checkin.timestamp).toLocaleString()}
                            </div>
                            <div className="mt-2 flex gap-2">
                              <Badge variant={checkin.status === 'APPROVED' ? 'default' : 'secondary'}>
                                {checkin.status}
                              </Badge>
                              {checkin.converted === 1 && (
                                <Badge className="bg-blue-100 text-blue-700">Converted</Badge>
                              )}
                            </div>
                          </div>
                          <img 
                            src={`${apiUrl}/api/photos/${checkin.id}`}
                            alt="Checkin photo"
                            loading="lazy"
                            width={64}
                            height={64}
                            className="h-16 w-16 object-cover rounded bg-slate-100 cursor-pointer hover:opacity-80"
                            onClick={() => openPhotoModal(checkin.id, `${selectedShop?.shop?.name || 'Shop'} - ${new Date(checkin.timestamp).toLocaleDateString()}`)}
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
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
