import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import { 
  TrendingUp, Users, MapPin, CheckCircle, Clock, Target,
  Calendar, Activity
} from 'lucide-react';
import DateRangeFilter from '@/components/DateRangeFilter';

interface DashboardProps {
  apiUrl: string;
}

interface KPIs {
  total_checkins: number;
  approved_checkins: number;
  pending_checkins: number;
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

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
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
    { name: 'Pending', value: kpis.pending_checkins },
  ] : [];

  const conversionPieData = conversionStats ? [
    { name: 'Converted', value: conversionStats.converted_yes },
    { name: 'Not Converted', value: conversionStats.converted_no },
  ] : [];

  const bettingPieData = conversionStats ? [
    { name: 'Already Betting', value: conversionStats.betting_yes },
    { name: 'New to Betting', value: conversionStats.betting_no },
  ] : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-slate-500 mt-1">SalesSync Performance Overview</p>
        </div>
        <div className="text-sm text-slate-500">
          Last updated: {new Date().toLocaleString()}
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm">Total Checkins</p>
                <p className="text-3xl font-bold mt-1">{kpis?.total_checkins?.toLocaleString() || 0}</p>
              </div>
              <CheckCircle className="h-12 w-12 text-emerald-200" />
            </div>
            <div className="mt-4 text-sm text-emerald-100">
              {approvalRate}% approval rate
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Active Agents</p>
                <p className="text-3xl font-bold mt-1">{kpis?.active_agents || 0}</p>
              </div>
              <Users className="h-12 w-12 text-blue-200" />
            </div>
            <div className="mt-4 text-sm text-blue-100">
              Across all regions
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-100 text-sm">Total Shops</p>
                <p className="text-3xl font-bold mt-1">{kpis?.total_shops?.toLocaleString() || 0}</p>
              </div>
              <MapPin className="h-12 w-12 text-amber-200" />
            </div>
            <div className="mt-4 text-sm text-amber-100">
              Registered locations
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
              <Target className="h-12 w-12 text-purple-200" />
            </div>
            <div className="mt-4 text-sm text-purple-100">
              {kpis?.conversions?.toLocaleString() || 0} conversions
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-emerald-600" />
              Checkins by Hour
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" tickFormatter={(h) => `${h}:00`} />
                <YAxis />
                <Tooltip 
                  labelFormatter={(h) => `${h}:00`}
                  formatter={(value: number) => [value.toLocaleString(), 'Checkins']}
                />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#10b981" 
                  fill="#10b98133"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Checkins by Day of Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day_name" />
                <YAxis />
                <Tooltip formatter={(value: number) => [value.toLocaleString(), 'Checkins']} />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-emerald-600" />
              Checkin Status
            </CardTitle>
          </CardHeader>
          <CardContent>
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
                <Tooltip formatter={(value: number) => value.toLocaleString()} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-purple-600" />
              Conversion Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
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
                <Tooltip formatter={(value: number) => value.toLocaleString()} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-amber-600" />
              Betting Status
            </CardTitle>
          </CardHeader>
          <CardContent>
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
                <Tooltip formatter={(value: number) => value.toLocaleString()} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            Top Agent Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={agentPerformance.slice(0, 10)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="agent_name" type="category" width={100} tick={{ fontSize: 12 }} />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  value.toLocaleString(), 
                  name === 'checkin_count' ? 'Checkins' : name === 'conversions' ? 'Conversions' : name
                ]}
              />
              <Legend />
              <Bar dataKey="checkin_count" name="Checkins" fill="#10b981" radius={[0, 4, 4, 0]} />
              <Bar dataKey="conversions" name="Conversions" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Key Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
              <h4 className="font-semibold text-emerald-800">Peak Activity Hours</h4>
              <p className="text-sm text-emerald-600 mt-1">
                Highest activity between 9:00 AM - 3:00 PM with peak at 9:00 AM
              </p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-800">Best Performing Days</h4>
              <p className="text-sm text-blue-600 mt-1">
                Friday shows highest activity, followed by Thursday and Wednesday
              </p>
            </div>
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <h4 className="font-semibold text-amber-800">Conversion Opportunity</h4>
              <p className="text-sm text-amber-600 mt-1">
                ~71% of contacts are new to betting - high conversion potential
              </p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <h4 className="font-semibold text-purple-800">Geographic Coverage</h4>
              <p className="text-sm text-purple-600 mt-1">
                Operations concentrated in Gauteng region (lat -25 to -26)
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <span className="text-slate-600">Average Checkins per Agent</span>
                <span className="font-bold text-slate-800">
                  {kpis && kpis.active_agents > 0 
                    ? Math.round(kpis.total_checkins / kpis.active_agents).toLocaleString()
                    : 0}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <span className="text-slate-600">Shops per Agent</span>
                <span className="font-bold text-slate-800">
                  {kpis && kpis.active_agents > 0 
                    ? Math.round(kpis.total_shops / kpis.active_agents)
                    : 0}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <span className="text-slate-600">Pending Review</span>
                <span className="font-bold text-amber-600">
                  {kpis?.pending_checkins?.toLocaleString() || 0}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <span className="text-slate-600">Approval Rate</span>
                <span className="font-bold text-emerald-600">{approvalRate}%</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <span className="text-slate-600">Conversion Rate</span>
                <span className="font-bold text-purple-600">{conversionRate}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
