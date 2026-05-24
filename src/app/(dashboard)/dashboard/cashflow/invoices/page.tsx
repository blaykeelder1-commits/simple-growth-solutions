"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  Search,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Calendar,
  X,
  Loader2,
} from "lucide-react";

interface Invoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  amountPaid: number;
  dueDate: string;
  status: string;
  riskLevel: string | null;
  recoveryLikelihood: number | null;
  client: {
    id: string;
    name: string;
  };
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  draft: { label: "Draft", color: "text-gray-700", bgColor: "bg-gray-100 border border-gray-200", icon: FileText },
  sent: { label: "Sent", color: "text-blue-700", bgColor: "bg-blue-100 border border-blue-200", icon: Clock },
  viewed: { label: "Viewed", color: "text-indigo-700", bgColor: "bg-indigo-100 border border-indigo-200", icon: Clock },
  partial: { label: "Partial", color: "text-amber-700", bgColor: "bg-amber-100 border border-amber-200", icon: AlertTriangle },
  paid: { label: "Paid", color: "text-emerald-700", bgColor: "bg-emerald-100 border border-emerald-200", icon: CheckCircle2 },
  overdue: { label: "Overdue", color: "text-red-700", bgColor: "bg-red-100 border border-red-200", icon: AlertTriangle },
  written_off: { label: "Written Off", color: "text-gray-700", bgColor: "bg-gray-100 border border-gray-200", icon: FileText },
};

const riskConfig: Record<string, { color: string; bgColor: string }> = {
  low: { color: "text-emerald-700", bgColor: "bg-emerald-100 border border-emerald-200" },
  medium: { color: "text-amber-700", bgColor: "bg-amber-100 border border-amber-200" },
  high: { color: "text-orange-700", bgColor: "bg-orange-100 border border-orange-200" },
  critical: { color: "text-red-700", bgColor: "bg-red-100 border border-red-200" },
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [form, setForm] = useState({
    clientName: "",
    clientEmail: "",
    invoiceNumber: "",
    amount: "",
    dueDate: "",
    notes: "",
  });

  const fetchInvoices = useCallback(async () => {
    try {
      const res = await fetch("/api/cashflow/invoices");
      if (res.ok) {
        const data = await res.json();
        setInvoices(data.data || data.invoices || []);
      }
    } catch {
      // UI shows empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);

    try {
      const res = await fetch("/api/cashflow/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: form.clientName,
          clientEmail: form.clientEmail || undefined,
          invoiceNumber: form.invoiceNumber,
          amount: parseFloat(form.amount),
          dueDate: form.dueDate,
          notes: form.notes || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to create invoice");
      }

      setShowCreateForm(false);
      setForm({ clientName: "", clientEmail: "", invoiceNumber: "", amount: "", dueDate: "", notes: "" });
      setLoading(true);
      fetchInvoices();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setCreating(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch =
      invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (invoice.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const filterButtons = [
    { key: "all", label: "All" },
    { key: "sent", label: "Sent" },
    { key: "overdue", label: "Overdue" },
    { key: "partial", label: "Partial" },
    { key: "paid", label: "Paid" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-500 mt-1">Manage and track your invoices</p>
        </div>
        <Button
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25"
          onClick={() => setShowCreateForm(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Invoice
        </Button>
      </div>

      {/* Create Invoice Form */}
      {showCreateForm && (
        <Card variant="professional" className="border-2 border-blue-200">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">New Invoice</h3>
              <button onClick={() => setShowCreateForm(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="clientName">Client Name *</Label>
                  <Input
                    id="clientName"
                    required
                    value={form.clientName}
                    onChange={(e) => setForm(f => ({ ...f, clientName: e.target.value }))}
                    placeholder="Acme Corp"
                  />
                </div>
                <div>
                  <Label htmlFor="clientEmail">Client Email</Label>
                  <Input
                    id="clientEmail"
                    type="email"
                    value={form.clientEmail}
                    onChange={(e) => setForm(f => ({ ...f, clientEmail: e.target.value }))}
                    placeholder="billing@acme.com"
                  />
                </div>
                <div>
                  <Label htmlFor="invoiceNumber">Invoice Number *</Label>
                  <Input
                    id="invoiceNumber"
                    required
                    value={form.invoiceNumber}
                    onChange={(e) => setForm(f => ({ ...f, invoiceNumber: e.target.value }))}
                    placeholder="INV-001"
                  />
                </div>
                <div>
                  <Label htmlFor="amount">Amount (USD) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={form.amount}
                    onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="1500.00"
                  />
                </div>
                <div>
                  <Label htmlFor="dueDate">Due Date *</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    required
                    value={form.dueDate}
                    onChange={(e) => setForm(f => ({ ...f, dueDate: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    id="notes"
                    value={form.notes}
                    onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Optional notes"
                  />
                </div>
              </div>

              {createError && (
                <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
                  {createError}
                </div>
              )}

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {creating ? "Creating..." : "Create Invoice"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card variant="professional">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 search-premium rounded-xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by invoice # or client name..."
                className="pl-11 h-11 border-0 bg-transparent focus-visible:ring-0"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {filterButtons.map((filter) => (
                <Button
                  key={filter.key}
                  variant={statusFilter === filter.key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(filter.key)}
                  className={statusFilter === filter.key
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 shadow-md"
                    : "bg-white/50 hover:bg-white"
                  }
                >
                  {filter.label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center mx-auto mb-5">
                <FileText className="h-10 w-10 text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No invoices yet
              </h3>
              <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                Create your first invoice or sync from QuickBooks/Xero to start tracking
              </p>
              <div className="flex justify-center gap-3">
                <Button
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25"
                  onClick={() => setShowCreateForm(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Invoice
                </Button>
                <Button variant="outline" className="bg-white/50 hover:bg-white">Connect QuickBooks</Button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-100 overflow-hidden">
              <Table className="table-professional">
                <TableHeader>
                  <TableRow className="bg-gray-50/80">
                    <TableHead className="font-semibold text-gray-600">Invoice #</TableHead>
                    <TableHead className="font-semibold text-gray-600">Client</TableHead>
                    <TableHead className="font-semibold text-gray-600">Amount</TableHead>
                    <TableHead className="font-semibold text-gray-600">Due Date</TableHead>
                    <TableHead className="font-semibold text-gray-600">Status</TableHead>
                    <TableHead className="font-semibold text-gray-600">Risk</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => {
                    const status = statusConfig[invoice.status] || statusConfig.sent;
                    const StatusIcon = status.icon;
                    const outstanding = Number(invoice.amount) - Number(invoice.amountPaid);
                    const isOverdue = new Date(invoice.dueDate) < new Date() && invoice.status !== "paid";
                    const risk = invoice.riskLevel ? riskConfig[invoice.riskLevel] : null;

                    return (
                      <TableRow key={invoice.id} className="hover:bg-blue-50/50 transition-colors">
                        <TableCell>
                          <span className="font-semibold text-gray-900">
                            {invoice.invoiceNumber}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                              <span className="font-semibold text-gray-600 text-xs">
                                {invoice.client?.name?.charAt(0).toUpperCase() || "?"}
                              </span>
                            </div>
                            <span className="text-gray-700">{invoice.client?.name ?? "Unknown"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <span className="font-semibold text-gray-900">
                              {formatCurrency(Number(invoice.amount))}
                            </span>
                            {Number(invoice.amountPaid) > 0 && outstanding > 0 && (
                              <span className="text-sm text-orange-600 block">
                                ({formatCurrency(outstanding)} due)
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className={`flex items-center gap-2 ${isOverdue ? "text-red-600" : "text-gray-700"}`}>
                            <Calendar className="h-4 w-4" />
                            <span className="font-medium">
                              {new Date(invoice.dueDate).toLocaleDateString()}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${isOverdue && invoice.status !== "paid" ? statusConfig.overdue.bgColor : status.bgColor} ${isOverdue && invoice.status !== "paid" ? statusConfig.overdue.color : status.color}`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {isOverdue && invoice.status !== "paid" ? "Overdue" : status.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {invoice.riskLevel && risk && (
                            <Badge className={`${risk.bgColor} ${risk.color} capitalize`}>
                              {invoice.riskLevel}
                            </Badge>
                          )}
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
