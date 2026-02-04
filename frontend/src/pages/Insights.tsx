import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import { 
  TrendingUp, Users, MapPin, CheckCircle, Clock, Target,
  Calendar, Activity, Award, Zap, ArrowUp,
  Store, UserCheck, BarChart3, PieChart as PieChartIcon
} from 'lucide-react';
import DateRangeFilter from '@/components/DateRangeFilter';

interface InsightsProps {
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

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function Insights({ apiUrl }: InsightsProps) {
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [agentPerformance, setAgentPerformance] = useState<AgentPerformance[]>([]);
  const [hourlyData, setHourlyData] = useState<HourlyData[]>([]);
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [conversionStats, setConversionStats] = useState<ConversionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchInsightsData();
  }, []);

  const fetchInsightsData = async () => {
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
      console.error('Failed to fetch insights data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateFilter = () => {
    fetchInsightsData();
  };

  const handleClearFilter = () => {
    fetchInsightsData();
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

  const avgCheckinsPerAgent = kpis && kpis.active_agents > 0 
    ? Math.round(kpis.total_checkins / kpis.active_agents)
    : 0;

  const newToBettingRate = conversionStats 
    ? ((conversionStats.betting_no / (conversionStats.betting_yes + conversionStats.betting_no)) * 100).toFixed(1)
    : '0';

  const peakHour = hourlyData.reduce((max, curr) => curr.count > max.count ? curr : max, { hour: 0, count: 0 });
  const peakDay = dailyData.reduce((max, curr) => curr.count > max.count ? curr : max, { day_name: '', count: 0 });
  
  const topAgent = agentPerformance.length > 0 ? agentPerformance[0] : null;
  const topConverterAgent = [...agentPerformance].sort((a, b) => b.conversion_rate - a.conversion_rate)[0] || null;

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
    <div className="space-y-8 pb-8">
      <div className="glass-card-solid rounded-2xl p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">SalesSync Data Insights</h1>
          <p className="text-slate-600 text-lg">Comprehensive analysis and performance summary</p>
          <p className="text-slate-500 text-sm mt-2">Data period: September 2025 - February 2026</p>
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
              <p className="text-blue-600 text-sm mt-2 font-medium flex items-center gap-1">
                <ArrowUp className="h-3 w-3" />
                {approvalRate}% approval rate
              </p>
            </div>
            <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-7 w-7 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="kpi-card kpi-card-blue animate-fade-in-up stagger-2">
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-slate-500 text-sm font-medium">Active Agents</p>
              <p className="text-3xl font-bold text-slate-800 mt-1">{kpis?.active_agents || 0}</p>
              <p className="text-blue-600 text-sm mt-2 font-medium flex items-center gap-1">
                <Zap className="h-3 w-3" />
                {avgCheckinsPerAgent} avg checkins/agent
              </p>
            </div>
            <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center">
              <Users className="h-7 w-7 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="kpi-card kpi-card-amber animate-fade-in-up stagger-3">
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-slate-500 text-sm font-medium">Total Shops</p>
              <p className="text-3xl font-bold text-slate-800 mt-1">{kpis?.total_shops?.toLocaleString() || 0}</p>
              <p className="text-amber-600 text-sm mt-2 font-medium flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                Registered locations
              </p>
            </div>
            <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center">
              <Store className="h-7 w-7 text-amber-600" />
            </div>
          </div>
        </div>

        <div className="kpi-card kpi-card-purple animate-fade-in-up stagger-4">
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-slate-500 text-sm font-medium">Conversion Rate</p>
              <p className="text-3xl font-bold text-slate-800 mt-1">{conversionRate}%</p>
              <p className="text-purple-600 text-sm mt-2 font-medium flex items-center gap-1">
                <UserCheck className="h-3 w-3" />
                {kpis?.conversions?.toLocaleString() || 0} conversions
              </p>
            </div>
            <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center">
              <Target className="h-7 w-7 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card-solid rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center gap-2">
            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
              <Award className="h-4 w-4 text-amber-600" />
            </div>
            <h3 className="font-semibold text-slate-800">Key Performance Highlights</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="insight-card insight-card-blue">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  <span className="font-semibold text-blue-800">Peak Hour</span>
                </div>
                <p className="text-3xl font-bold text-blue-600">{peakHour.hour}:00</p>
                <p className="text-sm text-blue-600 mt-1">{peakHour.count.toLocaleString()} checkins</p>
              </div>
              
              <div className="insight-card insight-card-blue">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <span className="font-semibold text-blue-800">Best Day</span>
                </div>
                <p className="text-3xl font-bold text-blue-600">{peakDay.day_name || 'N/A'}</p>
                <p className="text-sm text-blue-600 mt-1">{peakDay.count.toLocaleString()} checkins</p>
              </div>
              
              <div className="insight-card insight-card-purple">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-5 w-5 text-purple-600" />
                  <span className="font-semibold text-purple-800">Top Agent</span>
                </div>
                <p className="text-xl font-bold text-purple-600 truncate">{topAgent?.agent_name || 'N/A'}</p>
                <p className="text-sm text-purple-600 mt-1">{topAgent?.checkin_count.toLocaleString() || 0} checkins</p>
              </div>
              
              <div className="insight-card insight-card-amber">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-5 w-5 text-amber-600" />
                  <span className="font-semibold text-amber-800">Best Converter</span>
                </div>
                <p className="text-xl font-bold text-amber-600 truncate">{topConverterAgent?.agent_name || 'N/A'}</p>
                <p className="text-sm text-amber-600 mt-1">{topConverterAgent?.conversion_rate.toFixed(1) || 0}% rate</p>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card-solid rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="h-4 w-4 text-blue-600" />
            </div>
            <h3 className="font-semibold text-slate-800">Performance Metrics</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-slate-600">Approval Rate</span>
                  <span className="font-bold text-blue-600">{approvalRate}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3">
                  <div className="bg-gradient-to-r from-blue-400 to-blue-500 h-3 rounded-full transition-all" style={{ width: `${approvalRate}%` }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-slate-600">Conversion Rate</span>
                  <span className="font-bold text-purple-600">{conversionRate}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3">
                  <div className="bg-gradient-to-r from-purple-400 to-purple-500 h-3 rounded-full transition-all" style={{ width: `${conversionRate}%` }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-slate-600">New to Betting</span>
                  <span className="font-bold text-amber-600">{newToBettingRate}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3">
                  <div className="bg-gradient-to-r from-amber-400 to-amber-500 h-3 rounded-full transition-all" style={{ width: `${newToBettingRate}%` }}></div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 mt-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="stats-box">
                    <p className="text-2xl font-bold text-slate-800">{kpis?.pending_checkins?.toLocaleString() || 0}</p>
                    <p className="text-sm text-slate-500">Pending Review</p>
                  </div>
                  <div className="stats-box">
                    <p className="text-2xl font-bold text-slate-800">{kpis && kpis.active_agents > 0 ? Math.round(kpis.total_shops / kpis.active_agents) : 0}</p>
                    <p className="text-sm text-slate-500">Shops per Agent</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Card className="shadow-lg">
        <CardHeader className="bg-slate-50 border-b">
          <CardTitle className="flex items-center gap-2 text-slate-800">
            <Activity className="h-5 w-5 text-emerald-500" />
            Activity Patterns
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-slate-700 mb-4">Checkins by Hour</h4>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="hour" tickFormatter={(h) => `${h}:00`} stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip 
                    labelFormatter={(h) => `${h}:00`}
                    formatter={(value: number) => [value.toLocaleString(), 'Checkins']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
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
            </div>
            <div>
              <h4 className="font-semibold text-slate-700 mb-4">Checkins by Day of Week</h4>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="day_name" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip 
                    formatter={(value: number) => [value.toLocaleString(), 'Checkins']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="shadow-lg">
          <CardHeader className="bg-slate-50 border-b">
            <CardTitle className="flex items-center gap-2 text-slate-800">
              <PieChartIcon className="h-5 w-5 text-emerald-500" />
              Checkin Status
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
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

        <Card className="shadow-lg">
          <CardHeader className="bg-slate-50 border-b">
            <CardTitle className="flex items-center gap-2 text-slate-800">
              <Target className="h-5 w-5 text-purple-500" />
              Conversion Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={conversionPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
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

        <Card className="shadow-lg">
          <CardHeader className="bg-slate-50 border-b">
            <CardTitle className="flex items-center gap-2 text-slate-800">
              <TrendingUp className="h-5 w-5 text-amber-500" />
              Betting Experience
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={bettingPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
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

      <Card className="shadow-lg">
        <CardHeader className="bg-slate-50 border-b">
          <CardTitle className="flex items-center gap-2 text-slate-800">
            <Users className="h-5 w-5 text-blue-500" />
            Top 10 Agent Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={agentPerformance.slice(0, 10)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" stroke="#64748b" />
              <YAxis dataKey="agent_name" type="category" width={120} tick={{ fontSize: 12 }} stroke="#64748b" />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  value.toLocaleString(), 
                  name === 'checkin_count' ? 'Checkins' : name === 'conversions' ? 'Conversions' : name
                ]}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
              />
              <Legend />
              <Bar dataKey="checkin_count" name="Checkins" fill="#10b981" radius={[0, 4, 4, 0]} />
              <Bar dataKey="conversions" name="Conversions" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="shadow-lg bg-gradient-to-br from-slate-800 to-slate-900 text-white">
        <CardHeader className="border-b border-slate-700">
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-400" />
            Key Insights Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-4 bg-slate-700/50 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-5 w-5 text-blue-400" />
                <h4 className="font-semibold text-blue-400">Peak Activity</h4>
              </div>
              <p className="text-slate-300 text-sm">
                Highest activity between <span className="text-white font-semibold">9:00 AM - 3:00 PM</span> with peak at {peakHour.hour}:00. 
                Best day is <span className="text-white font-semibold">{peakDay.day_name}</span>.
              </p>
            </div>
            
            <div className="p-4 bg-slate-700/50 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <Target className="h-5 w-5 text-purple-400" />
                <h4 className="font-semibold text-purple-400">Conversion Opportunity</h4>
              </div>
              <p className="text-slate-300 text-sm">
                <span className="text-white font-semibold">{newToBettingRate}%</span> of contacts are new to betting - 
                significant conversion potential with targeted follow-ups.
              </p>
            </div>
            
            <div className="p-4 bg-slate-700/50 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-5 w-5 text-blue-400" />
                <h4 className="font-semibold text-blue-400">Agent Efficiency</h4>
              </div>
              <p className="text-slate-300 text-sm">
                Average of <span className="text-white font-semibold">{avgCheckinsPerAgent}</span> checkins per agent. 
                Top performer: <span className="text-white font-semibold">{topAgent?.agent_name}</span>.
              </p>
            </div>
            
            <div className="p-4 bg-slate-700/50 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="h-5 w-5 text-amber-400" />
                <h4 className="font-semibold text-amber-400">Coverage</h4>
              </div>
              <p className="text-slate-300 text-sm">
                <span className="text-white font-semibold">{kpis?.total_shops?.toLocaleString()}</span> shops covered across 
                <span className="text-white font-semibold"> {kpis?.active_agents}</span> agents in Gauteng region.
              </p>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-blue-500/20 rounded-xl border border-blue-500/30">
            <h4 className="font-semibold text-blue-400 mb-2">Recommendations</h4>
            <ul className="text-slate-300 text-sm space-y-2">
              <li className="flex items-start gap-2">
                <ArrowUp className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                Focus sales efforts during peak hours (9AM-3PM) for maximum engagement
              </li>
              <li className="flex items-start gap-2">
                <ArrowUp className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                Prioritize follow-ups with the {newToBettingRate}% new-to-betting contacts
              </li>
              <li className="flex items-start gap-2">
                <ArrowUp className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                Replicate top agent strategies across the team to improve conversion rates
              </li>
              <li className="flex items-start gap-2">
                <ArrowUp className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                Address {kpis?.pending_checkins?.toLocaleString()} pending checkins for faster approval cycle
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
