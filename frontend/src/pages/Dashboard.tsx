import { useState, useEffect } from 'react';
import { 
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import { 
  TrendingUp, Users, MapPin, Clock, Target,
  Calendar, Activity
} from 'lucide-react';
import DateRangeFilter from '@/components/DateRangeFilter';

interface DashboardProps {
  apiUrl: string;
}

interface KPIs {
  total_checkins: number;
  approved_checkins: number;
  active_agents: number;
  total_shops: number;
  conversions: number;
  total_visits: number;
}

interface AgentPerformance {
  agent_id: number;
  agent_name: string;
  checkin_count: number;
  conversions: number;
  conversion_rate: number;
}

interface HourlyData {
  hour: number;
  count: number;
}

interface DailyData {
  day_name: string;
  day_num: number;
  count: number;
}

interface ConversionStats {
  converted_yes: number;
  converted_no: number;
  betting_yes: number;
  betting_no: number;
}

const COLORS = ['#3A57E8', '#00C8C8', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function Dashboard({ apiUrl }: DashboardProps) {
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [agentPerformance, setAgentPerformance] = useState<AgentPerformance[]>([]);
  const [hourlyData, setHourlyData] = useState<HourlyData[]>([]);
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [conversionStats, setConversionStats] = useState<ConversionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const dateParams = new URLSearchParams();
      if (startDate) dateParams.append('startDate', startDate);
      if (endDate) dateParams.append('endDate', endDate);
      const queryString = dateParams.toString() ? `?${dateParams.toString()}` : '';

      const [kpisRes, agentsRes, hourlyRes, dailyRes, conversionRes] = await Promise.all([
        fetch(`${apiUrl}/api/dashboard/kpis${queryString}`),
        fetch(`${apiUrl}/api/dashboard/agent-performance${queryString}`),
        fetch(`${apiUrl}/api/dashboard/checkins-by-hour${queryString}`),
        fetch(`${apiUrl}/api/dashboard/checkins-by-day${queryString}`),
        fetch(`${apiUrl}/api/dashboard/conversion-stats${queryString}`),
      ]);

      const [kpisData, agentsData, hourlyDataRes, dailyDataRes, conversionData] = await Promise.all([
        kpisRes.json(),
        agentsRes.json(),
        hourlyRes.json(),
        dailyRes.json(),
        conversionRes.json(),
      ]);

      setKpis(kpisData.kpis);
      setAgentPerformance(agentsData.data || []);
      setHourlyData(hourlyDataRes.data || []);
      setDailyData(dailyDataRes.data || []);
      setConversionStats(conversionData.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateFilter = () => {
    fetchDashboardData();
  };

  const handleClearFilter = () => {
    fetchDashboardData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const conversionRate = kpis && kpis.total_visits > 0 
    ? ((kpis.conversions / kpis.total_visits) * 100).toFixed(1) 
    : '0';

  const approvalRate = kpis && kpis.total_checkins > 0
    ? ((kpis.approved_checkins / kpis.total_checkins) * 100).toFixed(1)
    : '0';

  const statusData = kpis ? [
    { name: 'Approved', value: kpis.approved_checkins },
  ] : [];

  const conversionPieData = conversionStats ? [
    { name: 'Converted', value: conversionStats.converted_yes },
    { name: 'Not Converted', value: conversionStats.converted_no },
  ] : [];

  const bettingPieData = conversionStats ? [
    { name: 'Already Betting', value: conversionStats.betting_yes },
    { name: 'New to Betting', value: conversionStats.betting_no },
  ] : [];

  // Circular progress component
  const CircularProgress = ({ value, color, size = 64 }: { value: number; color: string; size?: number }) => {
    const radius = (size - 8) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (value / 100) * circumference;
    
    return (
      <div className="circular-progress" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`}>
          <circle className="bg" cx={size/2} cy={size/2} r={radius} />
          <circle 
            className="progress" 
            cx={size/2} 
            cy={size/2} 
            r={radius}
            stroke={color}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-slate-500 mt-1">SalesSync Performance Overview</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">
            Last updated: {new Date().toLocaleString()}
          </span>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="kpi-card kpi-card-blue animate-fade-in-up stagger-1">
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-slate-500 text-sm font-medium">Total Checkins</p>
              <p className="text-3xl font-bold text-slate-800 mt-1">{kpis?.total_checkins?.toLocaleString() || 0}</p>
              <p className="text-blue-600 text-sm mt-2 font-medium">{approvalRate}% approval rate</p>
            </div>
            <CircularProgress value={parseFloat(approvalRate)} color="#3A57E8" />
          </div>
        </div>

        <div className="kpi-card kpi-card-blue animate-fade-in-up stagger-2">
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-slate-500 text-sm font-medium">Active Agents</p>
              <p className="text-3xl font-bold text-slate-800 mt-1">{kpis?.active_agents || 0}</p>
              <p className="text-blue-600 text-sm mt-2 font-medium">Across all regions</p>
            </div>
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="kpi-card kpi-card-amber animate-fade-in-up stagger-3">
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-slate-500 text-sm font-medium">Total Shops</p>
              <p className="text-3xl font-bold text-slate-800 mt-1">{kpis?.total_shops?.toLocaleString() || 0}</p>
              <p className="text-amber-600 text-sm mt-2 font-medium">Registered locations</p>
            </div>
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
              <MapPin className="h-8 w-8 text-amber-600" />
            </div>
          </div>
        </div>

        <div className="kpi-card kpi-card-purple animate-fade-in-up stagger-4">
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-slate-500 text-sm font-medium">Conversion Rate</p>
              <p className="text-3xl font-bold text-slate-800 mt-1">{conversionRate}%</p>
              <p className="text-purple-600 text-sm mt-2 font-medium">{kpis?.conversions?.toLocaleString() || 0} conversions</p>
            </div>
            <CircularProgress value={parseFloat(conversionRate)} color="#8b5cf6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="chart-container">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800">Checkins by Hour</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="hour" tickFormatter={(h) => `${h}:00`} stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip 
                labelFormatter={(h) => `${h}:00`}
                formatter={(value: number) => [value.toLocaleString(), 'Checkins']}
                contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
              />
              <Area 
                type="monotone" 
                dataKey="count" 
                stroke="#3A57E8" 
                fill="url(#blueGradient)"
                strokeWidth={2}
              />
              <defs>
                <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3A57E8" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#3A57E8" stopOpacity={0.05} />
                </linearGradient>
              </defs>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800">Checkins by Day of Week</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="day_name" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip 
                formatter={(value: number) => [value.toLocaleString(), 'Checkins']}
                contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
              />
              <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="chart-container">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Activity className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800">Checkin Status</h3>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="40%"
                innerRadius={50}
                outerRadius={70}
                paddingAngle={5}
                dataKey="value"
              >
                {statusData.map((_, index) => (
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

        <div className="chart-container">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <Target className="h-5 w-5 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800">Conversion Analysis</h3>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={conversionPieData}
                cx="50%"
                cy="40%"
                innerRadius={50}
                outerRadius={70}
                paddingAngle={5}
                dataKey="value"
              >
                {conversionPieData.map((_, index) => (
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

        <div className="chart-container">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-amber-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800">Betting Status</h3>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={bettingPieData}
                cx="50%"
                cy="40%"
                innerRadius={50}
                outerRadius={70}
                paddingAngle={5}
                dataKey="value"
              >
                {bettingPieData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
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

      <div className="chart-container">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <Users className="h-5 w-5 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800">Top Agent Performance</h3>
        </div>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={agentPerformance.slice(0, 10)} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis type="number" stroke="#94a3b8" />
            <YAxis dataKey="agent_name" type="category" width={100} tick={{ fontSize: 12 }} stroke="#94a3b8" />
            <Tooltip 
              formatter={(value: number, name: string) => [
                value.toLocaleString(), 
                name === 'checkin_count' ? 'Checkins' : name === 'conversions' ? 'Conversions' : name
              ]}
              contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
            />
            <Legend />
            <Bar dataKey="checkin_count" name="Checkins" fill="#10b981" radius={[0, 8, 8, 0]} />
            <Bar dataKey="conversions" name="Conversions" fill="#3b82f6" radius={[0, 8, 8, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card-solid rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Key Insights</h3>
          <div className="space-y-3">
            <div className="insight-card insight-card-blue">
              <h4 className="font-semibold text-blue-800">Peak Activity Hours</h4>
              <p className="text-sm text-blue-600 mt-1">
                Highest activity between 9:00 AM - 3:00 PM with peak at 9:00 AM
              </p>
            </div>
            <div className="insight-card insight-card-blue">
              <h4 className="font-semibold text-blue-800">Best Performing Days</h4>
              <p className="text-sm text-blue-600 mt-1">
                Friday shows highest activity, followed by Thursday and Wednesday
              </p>
            </div>
            <div className="insight-card insight-card-amber">
              <h4 className="font-semibold text-amber-800">Conversion Opportunity</h4>
              <p className="text-sm text-amber-600 mt-1">
                ~71% of contacts are new to betting - high conversion potential
              </p>
            </div>
            <div className="insight-card insight-card-purple">
              <h4 className="font-semibold text-purple-800">Geographic Coverage</h4>
              <p className="text-sm text-purple-600 mt-1">
                Operations concentrated in Gauteng region (lat -25 to -26)
              </p>
            </div>
          </div>
        </div>

        <div className="glass-card-solid rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Performance Summary</h3>
          <div className="space-y-3">
            <div className="stats-box flex items-center justify-between">
              <span className="text-slate-600">Average Checkins per Agent</span>
              <span className="font-bold text-slate-800 text-lg">
                {kpis && kpis.active_agents > 0 
                  ? Math.round(kpis.total_checkins / kpis.active_agents).toLocaleString()
                  : 0}
              </span>
            </div>
            <div className="stats-box flex items-center justify-between">
              <span className="text-slate-600">Shops per Agent</span>
              <span className="font-bold text-slate-800 text-lg">
                {kpis && kpis.active_agents > 0 
                  ? Math.round(kpis.total_shops / kpis.active_agents)
                  : 0}
              </span>
            </div>
            <div className="stats-box flex items-center justify-between">
              <span className="text-slate-600">Total Checkins</span>
              <span className="font-bold text-blue-600 text-lg">
                {kpis?.total_checkins?.toLocaleString() || 0}
              </span>
            </div>
            <div className="stats-box flex items-center justify-between">
              <span className="text-slate-600">Approval Rate</span>
              <span className="font-bold text-blue-600 text-lg">{approvalRate}%</span>
            </div>
            <div className="stats-box flex items-center justify-between">
              <span className="text-slate-600">Conversion Rate</span>
              <span className="font-bold text-purple-600 text-lg">{conversionRate}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
