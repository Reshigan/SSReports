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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
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

      <DateRangeFilter
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onApply={handleDateFilter}
        onClear={handleClearFilter}
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm">Total Shops</p>
                <p className="text-3xl font-bold mt-1">{total.toLocaleString()}</p>
              </div>
              <Store className="h-10 w-10 text-emerald-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Total Visits</p>
                <p className="text-3xl font-bold mt-1">
                  {shops.reduce((sum, s) => sum + (s.total_checkins || 0), 0).toLocaleString()}
                </p>
              </div>
              <Users className="h-10 w-10 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Total Conversions</p>
                <p className="text-3xl font-bold mt-1">
                  {shops.reduce((sum, s) => sum + (s.conversions || 0), 0).toLocaleString()}
                </p>
              </div>
              <TrendingUp className="h-10 w-10 text-purple-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-100 text-sm">Avg Visits/Shop</p>
                <p className="text-3xl font-bold mt-1">
                  {shops.length > 0 
                    ? Math.round(shops.reduce((sum, s) => sum + (s.total_checkins || 0), 0) / shops.length)
                    : 0}
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
              <Store className="h-5 w-5 text-emerald-600" />
              Top Performing Shops
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topShopsData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="checkins" name="Visits" fill="#10b981" radius={[0, 4, 4, 0]} />
                <Bar dataKey="conversions" name="Conversions" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              Conversion Rate by Shop
            </CardTitle>
          </CardHeader>
          <CardContent>
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
              <Store className="h-5 w-5 text-slate-600" />
              All Shops
            </CardTitle>
            <Input
              placeholder="Search shops..."
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
                    <Badge className="bg-emerald-100 text-emerald-700">{shop.conversions || 0}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`font-semibold ${
                      shop.total_checkins > 0 && (shop.conversions / shop.total_checkins) > 0.5 
                        ? 'text-emerald-600' 
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
        </CardContent>
      </Card>

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
                    <p className="text-2xl font-bold text-emerald-600">
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
                                <Badge className="bg-emerald-100 text-emerald-700">Converted</Badge>
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
