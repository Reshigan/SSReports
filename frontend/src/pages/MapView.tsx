import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Filter, RefreshCw } from 'lucide-react';

interface MapViewProps {
  apiUrl: string;
}

interface Shop {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

interface CheckinMarker {
  id: number;
  agent_id: number;
  latitude: number;
  longitude: number;
  timestamp: string;
  status: string;
  photo_path: string | null;
}

const defaultIcon = new Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export default function MapView({ apiUrl }: MapViewProps) {
  const [shops, setShops] = useState<Shop[]>([]);
  const [checkins, setCheckins] = useState<CheckinMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showShops, setShowShops] = useState(true);
  const [showCheckins, setShowCheckins] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [shopsRes, checkinsRes] = await Promise.all([
        fetch(`${apiUrl}/api/shops?limit=500`),
        fetch(`${apiUrl}/api/checkins-map${startDate && endDate ? `?startDate=${startDate}&endDate=${endDate}` : ''}`),
      ]);

      const [shopsData, checkinsData] = await Promise.all([
        shopsRes.json(),
        checkinsRes.json(),
      ]);

      setShops(shopsData.shops || []);
      setCheckins(checkinsData.checkins || []);
    } catch (error) {
      console.error('Failed to fetch map data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => {
    fetchData();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return '#10b981';
      case 'PENDING':
        return '#f59e0b';
      case 'FLAGGED':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const center: [number, number] = [-25.9, 28.0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Map View</h1>
          <p className="text-slate-500 mt-1">Store locations and checkin points</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showShops}
                  onChange={(e) => setShowShops(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Show Shops</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showCheckins}
                  onChange={(e) => setShowCheckins(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Show Checkins</span>
              </label>
            </div>
            <Button onClick={handleFilter} className="bg-emerald-600 hover:bg-emerald-700">
              <RefreshCw className="h-4 w-4 mr-2" />
              Apply Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <MapPin className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Shops</p>
                <p className="text-xl font-bold">{shops.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <MapPin className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Checkin Points</p>
                <p className="text-xl font-bold">{checkins.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <MapPin className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Pending</p>
                <p className="text-xl font-bold">
                  {checkins.filter(c => c.status === 'PENDING').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <MapPin className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Approved</p>
                <p className="text-xl font-bold">
                  {checkins.filter(c => c.status === 'APPROVED').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="h-96 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
            </div>
          ) : (
            <div className="h-[600px] rounded-lg overflow-hidden">
              <MapContainer
                center={center}
                zoom={10}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                {showShops && shops.map((shop) => (
                  <Marker
                    key={`shop-${shop.id}`}
                    position={[shop.latitude, shop.longitude]}
                    icon={defaultIcon}
                  >
                    <Popup>
                      <div className="p-2">
                        <h3 className="font-bold text-lg">{shop.name}</h3>
                        <p className="text-sm text-gray-600">{shop.address}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {shop.latitude.toFixed(4)}, {shop.longitude.toFixed(4)}
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                ))}

                {showCheckins && checkins.map((checkin) => (
                  <CircleMarker
                    key={`checkin-${checkin.id}`}
                    center={[checkin.latitude, checkin.longitude]}
                    radius={8}
                    fillColor={getStatusColor(checkin.status)}
                    color={getStatusColor(checkin.status)}
                    weight={2}
                    opacity={0.8}
                    fillOpacity={0.6}
                  >
                    <Popup>
                      <div className="p-2">
                        <h3 className="font-bold">Checkin #{checkin.id}</h3>
                        <p className="text-sm">Agent: {checkin.agent_id}</p>
                        <p className="text-sm">Status: <span className={`font-medium ${
                          checkin.status === 'APPROVED' ? 'text-emerald-600' : 
                          checkin.status === 'PENDING' ? 'text-amber-600' : 'text-red-600'
                        }`}>{checkin.status}</span></p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(checkin.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </MapContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Map Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <MapPin className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm">Shop Location</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-emerald-500"></div>
              <span className="text-sm">Approved Checkin</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-amber-500"></div>
              <span className="text-sm">Pending Checkin</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-red-500"></div>
              <span className="text-sm">Flagged Checkin</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
