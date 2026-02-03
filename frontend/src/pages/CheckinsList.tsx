import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Filter, ChevronLeft, ChevronRight, Eye, MapPin, Clock, User
} from 'lucide-react';

interface CheckinsListProps {
  apiUrl: string;
}

interface Checkin {
  id: number;
  agent_id: number;
  shop_id: number | null;
  timestamp: string;
  latitude: number;
  longitude: number;
  photo_path: string | null;
  notes: string;
  status: string;
  brand_id: number;
  category_id: number;
  product_id: number;
}

interface VisitResponse {
  id: number;
  checkin_id: number;
  visit_type: string;
  responses: string;
  converted: number;
  already_betting: number;
  created_at: string;
}

export default function CheckinsList({ apiUrl }: CheckinsListProps) {
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(20);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('');
  const [agentId, setAgentId] = useState('');
  const [selectedCheckin, setSelectedCheckin] = useState<Checkin | null>(null);
  const [checkinDetails, setCheckinDetails] = useState<{ checkin: Checkin; response: VisitResponse | null } | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    fetchCheckins();
  }, [page]);

  const fetchCheckins = async () => {
    setLoading(true);
    try {
      let url = `${apiUrl}/api/checkins?page=${page}&limit=${limit}`;
      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;
      if (status) url += `&status=${status}`;
      if (agentId) url += `&agentId=${agentId}`;

      const response = await fetch(url);
      const data = await response.json();

      setCheckins(data.checkins || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Failed to fetch checkins:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => {
    setPage(1);
    fetchCheckins();
  };

  const handleViewDetails = async (checkin: Checkin) => {
    setSelectedCheckin(checkin);
    setDetailsLoading(true);
    try {
      const response = await fetch(`${apiUrl}/api/checkins/${checkin.id}`);
      const data = await response.json();
      setCheckinDetails(data);
    } catch (error) {
      console.error('Failed to fetch checkin details:', error);
    } finally {
      setDetailsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <Badge className="bg-emerald-100 text-emerald-800">Approved</Badge>;
      case 'PENDING':
        return <Badge className="bg-amber-100 text-amber-800">Pending</Badge>;
      case 'FLAGGED':
        return <Badge className="bg-red-100 text-red-800">Flagged</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  const totalPages = Math.ceil(total / limit);

  const parseResponses = (responsesStr: string) => {
    try {
      return JSON.parse(responsesStr);
    } catch {
      return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Checkins</h1>
          <p className="text-slate-500 mt-1">View and filter all checkin records</p>
        </div>
        <div className="text-sm text-slate-500">
          Total: {total.toLocaleString()} records
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
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-40 h-10 px-3 rounded-md border border-input bg-background"
              >
                <option value="">All</option>
                <option value="APPROVED">Approved</option>
                <option value="PENDING">Pending</option>
                <option value="FLAGGED">Flagged</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="agentId">Agent ID</Label>
              <Input
                id="agentId"
                type="number"
                placeholder="Agent ID"
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                className="w-32"
              />
            </div>
            <Button onClick={handleFilter} className="bg-emerald-600 hover:bg-emerald-700">
              Apply Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {checkins.map((checkin) => (
                    <TableRow key={checkin.id}>
                      <TableCell className="font-medium">#{checkin.id}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-slate-400" />
                          {checkin.agent_id}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-slate-400" />
                          {new Date(checkin.timestamp).toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-slate-400" />
                          <span className="text-xs">
                            {checkin.latitude.toFixed(4)}, {checkin.longitude.toFixed(4)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(checkin.status)}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {checkin.notes || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(checkin)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex items-center justify-between p-4 border-t">
                <div className="text-sm text-slate-500">
                  Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm text-slate-600">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedCheckin} onOpenChange={() => setSelectedCheckin(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Checkin Details #{selectedCheckin?.id}</DialogTitle>
          </DialogHeader>
          {detailsLoading ? (
            <div className="h-32 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            </div>
          ) : checkinDetails ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-slate-500">Agent ID</p>
                  <p className="font-medium">{checkinDetails.checkin.agent_id}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-slate-500">Status</p>
                  {getStatusBadge(checkinDetails.checkin.status)}
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-slate-500">Timestamp</p>
                  <p className="font-medium">{new Date(checkinDetails.checkin.timestamp).toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-slate-500">Location</p>
                  <p className="font-medium">
                    {checkinDetails.checkin.latitude.toFixed(6)}, {checkinDetails.checkin.longitude.toFixed(6)}
                  </p>
                </div>
              </div>

              {checkinDetails.checkin.notes && (
                <div className="space-y-1">
                  <p className="text-sm text-slate-500">Notes</p>
                  <p className="p-3 bg-slate-50 rounded-lg">{checkinDetails.checkin.notes}</p>
                </div>
              )}

              {checkinDetails.response && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-lg">Visit Response</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-slate-500">Visit Type</p>
                      <p className="font-medium">{checkinDetails.response.visit_type}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-slate-500">Converted</p>
                      <Badge className={checkinDetails.response.converted ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-800'}>
                        {checkinDetails.response.converted ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-slate-500">Already Betting</p>
                      <Badge className={checkinDetails.response.already_betting ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}>
                        {checkinDetails.response.already_betting ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                  </div>

                  {checkinDetails.response.responses && (
                    <div className="space-y-2">
                      <p className="text-sm text-slate-500">Response Details</p>
                      <div className="p-4 bg-slate-50 rounded-lg text-sm">
                        {(() => {
                          const parsed = parseResponses(checkinDetails.response.responses);
                          if (!parsed) return <pre>{checkinDetails.response.responses}</pre>;
                          
                          return (
                            <div className="space-y-4">
                              {parsed.consumerDetails && (
                                <div>
                                  <h5 className="font-medium mb-2">Consumer Details</h5>
                                  <div className="grid grid-cols-2 gap-2 text-sm">
                                    <p><span className="text-slate-500">Name:</span> {parsed.consumerDetails.consumerName} {parsed.consumerDetails.consumerSurname}</p>
                                    <p><span className="text-slate-500">Phone:</span> {parsed.consumerDetails.cellphoneNumber}</p>
                                    <p><span className="text-slate-500">ID:</span> {parsed.consumerDetails.idPassportNumber}</p>
                                    <p><span className="text-slate-500">Goldrush ID:</span> {parsed.consumerDetails.goldrushId}</p>
                                  </div>
                                </div>
                              )}
                              {parsed.bettingInfo && (
                                <div>
                                  <h5 className="font-medium mb-2">Betting Info</h5>
                                  <div className="grid grid-cols-2 gap-2 text-sm">
                                    <p><span className="text-slate-500">Betting Elsewhere:</span> {parsed.bettingInfo.isBettingSomewhere}</p>
                                    {parsed.bettingInfo.currentBettingCompany && (
                                      <p><span className="text-slate-500">Current Company:</span> {parsed.bettingInfo.currentBettingCompany}</p>
                                    )}
                                    <p><span className="text-slate-500">Used Goldrush:</span> {parsed.bettingInfo.usedGoldrushBefore}</p>
                                    <p><span className="text-slate-500">Likes Goldrush:</span> {parsed.bettingInfo.likesGoldrush}</p>
                                  </div>
                                </div>
                              )}
                              {parsed.conversion && (
                                <div>
                                  <h5 className="font-medium mb-2">Conversion</h5>
                                  <p><span className="text-slate-500">Converted:</span> {parsed.conversion.converted}</p>
                                </div>
                              )}
                              {parsed.additionalNotes && (
                                <div>
                                  <h5 className="font-medium mb-2">Additional Notes</h5>
                                  <p>{parsed.additionalNotes}</p>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
