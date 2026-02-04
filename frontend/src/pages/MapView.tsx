import { useState, useEffect } from 'react';
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
        return '#3A57E8';
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

      <div className="glass-card-solid rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
            <Filter className="h-4 w-4 text-slate-600" />
          </div>
          <h3 className="font-semibold text-slate-800">Filters</h3>
        </div>
        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-2">
            <Label htmlFor="startDate" className="text-slate-600 text-sm">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-40 glass-input"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endDate" className="text-slate-600 text-sm">End Date</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-40 glass-input"
            />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showShops}
                onChange={(e) => setShowShops(e.target.checked)}
                className="rounded accent-blue-600"
              />
              <span className="text-sm text-slate-600">Show Shops</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showCheckins}
                onChange={(e) => setShowCheckins(e.target.checked)}
                className="rounded accent-blue-600"
              />
              <span className="text-sm text-slate-600">Show Checkins</span>
            </label>
          </div>
          <Button onClick={handleFilter} className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-lg shadow-blue-500/30 rounded-xl">
            <RefreshCw className="h-4 w-4 mr-2" />
            Apply Filters
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="kpi-card kpi-card-blue">
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-slate-500 text-sm font-medium">Total Shops</p>
              <p className="text-3xl font-bold text-slate-800 mt-1">{shops.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <MapPin className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="kpi-card kpi-card-blue">
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-slate-500 text-sm font-medium">Checkin Points</p>
              <p className="text-3xl font-bold text-slate-800 mt-1">{checkins.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <MapPin className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="kpi-card kpi-card-purple">
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-slate-500 text-sm font-medium">Unique Agents</p>
              <p className="text-3xl font-bold text-slate-800 mt-1">
                {new Set(checkins.map(c => c.agent_id)).size}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <MapPin className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
        <div className="kpi-card kpi-card-blue">
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-slate-500 text-sm font-medium">Approved</p>
              <p className="text-3xl font-bold text-slate-800 mt-1">
                {checkins.filter(c => c.status === 'APPROVED').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <MapPin className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card-solid rounded-2xl overflow-hidden">
        <div className="p-0">
          {loading ? (
            <div className="h-96 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
                          checkin.status === 'APPROVED' ? 'text-blue-600' : 'text-red-600'
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
        </div>
      </div>

      <div className="glass-card-solid rounded-2xl p-6">
        <h3 className="font-semibold text-slate-800 mb-4">Map Legend</h3>
        <div className="flex flex-wrap gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
              <MapPin className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm text-slate-600">Shop Location</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-blue-500"></div>
            <span className="text-sm text-slate-600">Approved Checkin</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-500"></div>
            <span className="text-sm text-slate-600">Flagged Checkin</span>
          </div>
        </div>
      </div>
    </div>
  );
}
