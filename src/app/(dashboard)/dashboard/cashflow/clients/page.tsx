"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, Search, Plus, TrendingUp, TrendingDown, AlertTriangle, DollarSign } from "lucide-react";

interface Client {
  id: string;
  name: string;
  email: string | null;
  paymentScore: number | null;
  avgDaysToPayment: number | null;
  totalOutstanding: number;
  totalPaid: number;
  _count: {
    invoices: number;
  };
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    async function fetchClients() {
      try {
        const res = await fetch("/api/cashflow/clients");
        if (res.ok) {
          const data = await res.json();
          setClients(data.clients || []);
        }
      } catch {
        // Failed to fetch clients
      } finally {
        setLoading(false);
      }
    }

    fetchClients();
  }, []);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  const getScoreColor = (score: number | null) => {
    if (score === null) return "text-gray-400";
    if (score >= 80) return "text-emerald-600";
    if (score >= 60) return "text-blue-600";
    if (score >= 40) return "text-orange-600";
    return "text-red-600";
  };

  const getScoreBadge = (score: number | null) => {
    if (score === null) return { label: "New", color: "bg-gray-100 text-gray-600 border border-gray-200" };
    if (score >= 80) return { label: "Excellent", color: "bg-emerald-100 text-emerald-800 border border-emerald-200" };
    if (score >= 60) return { label: "Good", color: "bg-blue-100 text-blue-800 border border-blue-200" };
    if (score >= 40) return { label: "Fair", color: "bg-amber-100 text-amber-800 border border-amber-200" };
    return { label: "At Risk", color: "bg-red-100 text-red-800 border border-red-200" };
  };

  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const highRiskClients = clients.filter((c) => c.paymentScore !== null && c.paymentScore < 40).length;
  const totalOutstanding = clients.reduce((sum, c) => sum + c.totalOutstanding, 0);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-500 mt-1">Manage clients and view payment behavior</p>
        </div>
        <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25">
          <Plus className="h-4 w-4 mr-2" />
          Add Client
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-5 md:grid-cols-3">
        <Card variant="professional" hover="lift" className="stat-card stat-card-blue">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Clients
            </CardTitle>
            <div className="icon-container icon-container-blue">
              <Users className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{clients.length}</div>
            <p className="text-sm text-gray-500 mt-1">Active accounts</p>
          </CardContent>
        </Card>

        <Card variant="professional" hover="lift" className="stat-card stat-card-orange">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-gray-500">
              High Risk Clients
            </CardTitle>
            <div className="icon-container icon-container-orange">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              {highRiskClients}
            </div>
            <p className="text-sm text-gray-500 mt-1">Payment score below 40</p>
          </CardContent>
        </Card>

        <Card variant="professional" hover="lift" className="stat-card stat-card-green">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Outstanding
            </CardTitle>
            <div className="icon-container icon-container-green">
              <DollarSign className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {formatCurrency(totalOutstanding)}
            </div>
            <p className="text-sm text-gray-500 mt-1">Awaiting payment</p>
          </CardContent>
        </Card>
      </div>

      <Card variant="professional">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 search-premium rounded-xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search clients by name or email..."
                className="pl-11 h-11 border-0 bg-transparent focus-visible:ring-0"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center mx-auto mb-5">
                <Users className="h-10 w-10 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No clients yet
              </h3>
              <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                Add your first client or sync from QuickBooks/Xero to start tracking payments
              </p>
              <div className="flex justify-center gap-3">
                <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Client
                </Button>
                <Button variant="outline" className="bg-white/50 hover:bg-white">Connect QuickBooks</Button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-100 overflow-hidden">
              <Table className="table-professional">
                <TableHeader>
                  <TableRow className="bg-gray-50/80">
                    <TableHead className="font-semibold text-gray-600">Client</TableHead>
                    <TableHead className="font-semibold text-gray-600">Payment Score</TableHead>
                    <TableHead className="font-semibold text-gray-600">Avg Days to Pay</TableHead>
                    <TableHead className="font-semibold text-gray-600">Outstanding</TableHead>
                    <TableHead className="font-semibold text-gray-600">Total Paid</TableHead>
                    <TableHead className="font-semibold text-gray-600">Invoices</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.map((client) => {
                    const scoreBadge = getScoreBadge(client.paymentScore);

                    return (
                      <TableRow key={client.id} className="hover:bg-blue-50/50 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                              <span className="font-semibold text-gray-600">
                                {client.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-900">{client.name}</span>
                              {client.email && (
                                <span className="text-sm text-gray-500 block">
                                  {client.email}
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={`text-lg font-bold ${getScoreColor(client.paymentScore)}`}>
                              {client.paymentScore ?? "—"}
                            </span>
                            <Badge className={`${scoreBadge.color} text-xs`}>{scoreBadge.label}</Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          {client.avgDaysToPayment ? (
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{Math.round(client.avgDaysToPayment)} days</span>
                              {client.avgDaysToPayment <= 30 ? (
                                <TrendingUp className="h-4 w-4 text-emerald-500" />
                              ) : client.avgDaysToPayment > 45 ? (
                                <TrendingDown className="h-4 w-4 text-red-500" />
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className={client.totalOutstanding > 0 ? "text-orange-600 font-semibold" : "text-gray-500"}>
                            {formatCurrency(client.totalOutstanding)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-gray-700">{formatCurrency(client.totalPaid)}</span>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 text-sm font-medium text-gray-600">
                            {client._count?.invoices ?? 0}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" className="hover:bg-blue-100 hover:text-blue-600">
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
