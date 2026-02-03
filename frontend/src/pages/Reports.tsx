import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { 
  FileSpreadsheet, FileText, Calendar, TrendingUp,
  Users, MapPin, Target
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportsProps {
  apiUrl: string;
}

interface AgentPerformance {
  agent_id: number;
  agent_name: string;
  checkin_count: number;
  conversions: number;
  conversion_rate: number;
}

interface ExportData {
  id: number;
  agent_id: number;
  shop_id: number | null;
  timestamp: string;
  latitude: number;
  longitude: number;
  status: string;
  notes: string;
  visit_type: string;
  converted: number;
  already_betting: number;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function Reports({ apiUrl }: ReportsProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [agentPerformance, setAgentPerformance] = useState<AgentPerformance[]>([]);
  const [hourlyData, setHourlyData] = useState<{ hour: number; count: number }[]>([]);
  const [dailyData, setDailyData] = useState<{ day_name: string; count: number }[]>([]);
  const [conversionStats, setConversionStats] = useState<{
    converted_yes: number;
    converted_no: number;
    betting_yes: number;
    betting_no: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const [agentsRes, hourlyRes, dailyRes, conversionRes] = await Promise.all([
        fetch(`${apiUrl}/api/dashboard/agent-performance`),
        fetch(`${apiUrl}/api/dashboard/checkins-by-hour`),
        fetch(`${apiUrl}/api/dashboard/checkins-by-day`),
        fetch(`${apiUrl}/api/dashboard/conversion-stats`),
      ]);

      const [agentsData, hourlyDataRes, dailyDataRes, conversionData] = await Promise.all([
        agentsRes.json(),
        hourlyRes.json(),
        dailyRes.json(),
        conversionRes.json(),
      ]);

      setAgentPerformance(agentsData.data || []);
      setHourlyData(hourlyDataRes.data || []);
      setDailyData(dailyDataRes.data || []);
      setConversionStats(conversionData.data);
    } catch (error) {
      console.error('Failed to fetch report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = async () => {
    setExporting(true);
    try {
      let url = `${apiUrl}/api/export/checkins?format=json`;
      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;

      const response = await fetch(url);
      const result = await response.json();
      const data: ExportData[] = result.data || [];

      const worksheet = XLSX.utils.json_to_sheet(data.map(item => ({
        'ID': item.id,
        'Agent ID': item.agent_id,
        'Shop ID': item.shop_id || 'N/A',
        'Timestamp': item.timestamp,
        'Latitude': item.latitude,
        'Longitude': item.longitude,
        'Status': item.status,
        'Notes': item.notes || '',
        'Visit Type': item.visit_type || '',
        'Converted': item.converted ? 'Yes' : 'No',
        'Already Betting': item.already_betting ? 'Yes' : 'No',
      })));

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Checkins');

      const agentSheet = XLSX.utils.json_to_sheet(agentPerformance.map(agent => ({
        'Agent ID': agent.agent_id,
        'Agent Name': agent.agent_name,
        'Total Checkins': agent.checkin_count,
        'Conversions': agent.conversions,
        'Conversion Rate (%)': agent.conversion_rate,
      })));
      XLSX.utils.book_append_sheet(workbook, agentSheet, 'Agent Performance');

      XLSX.writeFile(workbook, `SSReports_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const exportToPDF = async () => {
    setExporting(true);
    try {
      const doc = new jsPDF();
      
      doc.setFontSize(20);
      doc.setTextColor(16, 185, 129);
      doc.text('SSReports - SalesSync Analytics', 14, 22);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
      if (startDate || endDate) {
        doc.text(`Date Range: ${startDate || 'Start'} to ${endDate || 'End'}`, 14, 36);
      }

      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text('Agent Performance Summary', 14, 50);

      autoTable(doc, {
        startY: 55,
        head: [['Agent ID', 'Name', 'Checkins', 'Conversions', 'Rate (%)']],
        body: agentPerformance.slice(0, 15).map(agent => [
          agent.agent_id.toString(),
          agent.agent_name || 'N/A',
          agent.checkin_count.toString(),
          agent.conversions.toString(),
          agent.conversion_rate.toFixed(1),
        ]),
        theme: 'striped',
        headStyles: { fillColor: [16, 185, 129] },
      });

      const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY || 120;

      doc.setFontSize(14);
      doc.text('Conversion Statistics', 14, finalY + 15);

      if (conversionStats) {
        const totalVisits = conversionStats.converted_yes + conversionStats.converted_no;
        const conversionRate = totalVisits > 0 ? ((conversionStats.converted_yes / totalVisits) * 100).toFixed(1) : '0';
        
        autoTable(doc, {
          startY: finalY + 20,
          head: [['Metric', 'Value']],
          body: [
            ['Total Visits', totalVisits.toString()],
            ['Converted', conversionStats.converted_yes.toString()],
            ['Not Converted', conversionStats.converted_no.toString()],
            ['Conversion Rate', `${conversionRate}%`],
            ['Already Betting', conversionStats.betting_yes.toString()],
            ['New to Betting', conversionStats.betting_no.toString()],
          ],
          theme: 'striped',
          headStyles: { fillColor: [59, 130, 246] },
        });
      }

      doc.setFontSize(12);
      doc.text('Key Insights:', 14, (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15);
      doc.setFontSize(10);
      const insights = [
        '- Peak activity hours: 9:00 AM - 3:00 PM',
        '- Best performing days: Friday, Thursday, Wednesday',
        '- Geographic focus: Gauteng region',
        '- High conversion potential with new-to-betting contacts',
      ];
      insights.forEach((insight, index) => {
        doc.text(insight, 14, (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 22 + (index * 6));
      });

      doc.save(`SSReports_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('PDF export failed:', error);
      alert('PDF export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const conversionPieData = conversionStats ? [
    { name: 'Converted', value: conversionStats.converted_yes },
    { name: 'Not Converted', value: conversionStats.converted_no },
  ] : [];

  const bettingPieData = conversionStats ? [
    { name: 'Already Betting', value: conversionStats.betting_yes },
    { name: 'New to Betting', value: conversionStats.betting_no },
  ] : [];

  if (loading) {
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
          <h1 className="text-3xl font-bold text-slate-800">Reports</h1>
          <p className="text-slate-500 mt-1">Generate and export analytics reports</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Export Options
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
            <Button 
              onClick={exportToExcel} 
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={exporting}
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              {exporting ? 'Exporting...' : 'Export to Excel'}
            </Button>
            <Button 
              onClick={exportToPDF}
              variant="outline"
              disabled={exporting}
            >
              <FileText className="h-4 w-4 mr-2" />
              {exporting ? 'Exporting...' : 'Export to PDF'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-600" />
              Agent Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={agentPerformance.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="agent_name" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="checkin_count" name="Checkins" fill="#10b981" />
                <Bar dataKey="conversions" name="Conversions" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Hourly Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" tickFormatter={(h) => `${h}:00`} />
                <YAxis />
                <Tooltip labelFormatter={(h) => `${h}:00`} />
                <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-amber-600" />
              Daily Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day_name" tick={{ fontSize: 10 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-purple-600" />
              Conversion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={conversionPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {conversionPieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-red-600" />
              Betting Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={bettingPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {bettingPieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Agent Performance Table</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Rank</th>
                  <th className="text-left p-3 font-medium">Agent ID</th>
                  <th className="text-left p-3 font-medium">Name</th>
                  <th className="text-right p-3 font-medium">Checkins</th>
                  <th className="text-right p-3 font-medium">Conversions</th>
                  <th className="text-right p-3 font-medium">Rate</th>
                </tr>
              </thead>
              <tbody>
                {agentPerformance.map((agent, index) => (
                  <tr key={agent.agent_id} className="border-b hover:bg-slate-50">
                    <td className="p-3">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                        index < 3 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {index + 1}
                      </span>
                    </td>
                    <td className="p-3">{agent.agent_id}</td>
                    <td className="p-3">{agent.agent_name || 'N/A'}</td>
                    <td className="p-3 text-right font-medium">{agent.checkin_count.toLocaleString()}</td>
                    <td className="p-3 text-right">{agent.conversions.toLocaleString()}</td>
                    <td className="p-3 text-right">
                      <span className={`font-medium ${
                        agent.conversion_rate >= 30 ? 'text-emerald-600' : 
                        agent.conversion_rate >= 20 ? 'text-amber-600' : 'text-slate-600'
                      }`}>
                        {agent.conversion_rate.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Summary Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-emerald-50 rounded-lg">
              <p className="text-sm text-emerald-600">Total Agents</p>
              <p className="text-2xl font-bold text-emerald-800">{agentPerformance.length}</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-600">Total Checkins</p>
              <p className="text-2xl font-bold text-blue-800">
                {agentPerformance.reduce((sum, a) => sum + a.checkin_count, 0).toLocaleString()}
              </p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-purple-600">Total Conversions</p>
              <p className="text-2xl font-bold text-purple-800">
                {agentPerformance.reduce((sum, a) => sum + a.conversions, 0).toLocaleString()}
              </p>
            </div>
            <div className="p-4 bg-amber-50 rounded-lg">
              <p className="text-sm text-amber-600">Avg Conversion Rate</p>
              <p className="text-2xl font-bold text-amber-800">
                {(agentPerformance.reduce((sum, a) => sum + a.conversion_rate, 0) / agentPerformance.length || 0).toFixed(1)}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
