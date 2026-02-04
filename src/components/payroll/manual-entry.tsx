"use client";

import { useState, useCallback } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PayrollEntry {
  employeeName: string;
  department: string;
  regularHours: number;
  overtimeHours: number;
  grossPay: number;
  deductions: number;
  netPay: number;
}

interface ManualPayrollEntryProps {
  onSubmit: (data: {
    periodStart: string;
    periodEnd: string;
    payDate: string;
    entries: PayrollEntry[];
  }) => Promise<void>;
  onCancel: () => void;
}

export function ManualPayrollEntry({
  onSubmit,
  onCancel,
}: ManualPayrollEntryProps) {
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [payDate, setPayDate] = useState("");
  const [entries, setEntries] = useState<PayrollEntry[]>([
    {
      employeeName: "",
      department: "",
      regularHours: 80,
      overtimeHours: 0,
      grossPay: 0,
      deductions: 0,
      netPay: 0,
    },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const addEntry = useCallback(() => {
    setEntries((prev) => [
      ...prev,
      {
        employeeName: "",
        department: "",
        regularHours: 80,
        overtimeHours: 0,
        grossPay: 0,
        deductions: 0,
        netPay: 0,
      },
    ]);
  }, []);

  const removeEntry = useCallback((index: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateEntry = useCallback(
    (index: number, field: keyof PayrollEntry, value: string | number) => {
      setEntries((prev) => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          [field]: value,
        };

        // Auto-calculate net pay
        if (field === "grossPay" || field === "deductions") {
          const grossPay =
            field === "grossPay" ? Number(value) : updated[index].grossPay;
          const deductions =
            field === "deductions" ? Number(value) : updated[index].deductions;
          updated[index].netPay = Math.max(0, grossPay - deductions);
        }

        return updated;
      });
    },
    []
  );

  const validateForm = useCallback((): string[] => {
    const validationErrors: string[] = [];

    if (!periodStart) validationErrors.push("Period start date is required");
    if (!periodEnd) validationErrors.push("Period end date is required");
    if (!payDate) validationErrors.push("Pay date is required");

    if (periodStart && periodEnd && new Date(periodStart) > new Date(periodEnd)) {
      validationErrors.push("Period start must be before period end");
    }

    entries.forEach((entry, index) => {
      if (!entry.employeeName.trim()) {
        validationErrors.push(`Employee ${index + 1}: Name is required`);
      }
      if (entry.grossPay <= 0) {
        validationErrors.push(`Employee ${index + 1}: Gross pay must be positive`);
      }
    });

    return validationErrors;
  }, [periodStart, periodEnd, payDate, entries]);

  const handleSubmit = useCallback(async () => {
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors([]);

    try {
      await onSubmit({
        periodStart,
        periodEnd,
        payDate,
        entries,
      });
    } catch (error) {
      setErrors([
        error instanceof Error ? error.message : "Failed to save payroll data",
      ]);
    } finally {
      setIsSubmitting(false);
    }
  }, [validateForm, onSubmit, periodStart, periodEnd, payDate, entries]);

  const totals = entries.reduce(
    (acc, entry) => ({
      regularHours: acc.regularHours + entry.regularHours,
      overtimeHours: acc.overtimeHours + entry.overtimeHours,
      grossPay: acc.grossPay + entry.grossPay,
      deductions: acc.deductions + entry.deductions,
      netPay: acc.netPay + entry.netPay,
    }),
    { regularHours: 0, overtimeHours: 0, grossPay: 0, deductions: 0, netPay: 0 }
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Manual Payroll Entry</CardTitle>
            <CardDescription>
              Enter payroll data for small teams (up to 10 employees)
            </CardDescription>
          </div>
          <Badge variant="secondary">Manual Entry</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Period Information */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Period Start
            </label>
            <input
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Period End
            </label>
            <input
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pay Date
            </label>
            <input
              type="date"
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Employee Entries */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              Employee Entries ({entries.length})
            </h3>
            <Button
              type="button"
              variant="outline"
              onClick={addEntry}
              disabled={entries.length >= 10}
            >
              + Add Employee
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">
                    Employee Name
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">
                    Department
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500">
                    Reg. Hours
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500">
                    OT Hours
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500">
                    Gross Pay
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500">
                    Deductions
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500">
                    Net Pay
                  </th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {entries.map((entry, index) => (
                  <tr key={index} className="bg-white">
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={entry.employeeName}
                        onChange={(e) =>
                          updateEntry(index, "employeeName", e.target.value)
                        }
                        placeholder="Employee name"
                        className="w-full px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={entry.department}
                        onChange={(e) =>
                          updateEntry(index, "department", e.target.value)
                        }
                        placeholder="Department"
                        className="w-full px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={entry.regularHours}
                        onChange={(e) =>
                          updateEntry(index, "regularHours", Number(e.target.value))
                        }
                        min="0"
                        step="0.5"
                        className="w-20 px-2 py-1 border border-gray-200 rounded text-right focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={entry.overtimeHours}
                        onChange={(e) =>
                          updateEntry(index, "overtimeHours", Number(e.target.value))
                        }
                        min="0"
                        step="0.5"
                        className="w-20 px-2 py-1 border border-gray-200 rounded text-right focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center">
                        <span className="text-gray-400 mr-1">$</span>
                        <input
                          type="number"
                          value={entry.grossPay}
                          onChange={(e) =>
                            updateEntry(index, "grossPay", Number(e.target.value))
                          }
                          min="0"
                          step="0.01"
                          className="w-24 px-2 py-1 border border-gray-200 rounded text-right focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center">
                        <span className="text-gray-400 mr-1">$</span>
                        <input
                          type="number"
                          value={entry.deductions}
                          onChange={(e) =>
                            updateEntry(index, "deductions", Number(e.target.value))
                          }
                          min="0"
                          step="0.01"
                          className="w-24 px-2 py-1 border border-gray-200 rounded text-right focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-gray-900">
                      ${entry.netPay.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-3 py-2">
                      {entries.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeEntry(index)}
                          className="text-red-500 hover:text-red-700"
                          aria-label="Remove employee"
                        >
                          <svg
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 font-medium">
                <tr>
                  <td className="px-3 py-2" colSpan={2}>
                    Totals
                  </td>
                  <td className="px-3 py-2 text-right">{totals.regularHours}</td>
                  <td className="px-3 py-2 text-right">{totals.overtimeHours}</td>
                  <td className="px-3 py-2 text-right">
                    ${totals.grossPay.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td className="px-3 py-2 text-right">
                    ${totals.deductions.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td className="px-3 py-2 text-right text-green-600">
                    ${totals.netPay.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="text-red-800 font-medium mb-2">
              Please fix the following errors:
            </h4>
            <ul className="list-disc list-inside text-red-700 text-sm space-y-1">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-between bg-gray-50">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="bg-gradient-to-r from-blue-600 to-indigo-600"
        >
          {isSubmitting ? "Saving..." : "Save Payroll Data"}
        </Button>
      </CardFooter>
    </Card>
  );
}

// CSV Upload Component
interface CSVUploadProps {
  onUpload: (data: PayrollEntry[]) => void;
}

export function PayrollCSVUpload({ onUpload }: CSVUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);

      if (!file.name.endsWith(".csv")) {
        setError("Please upload a CSV file");
        return;
      }

      try {
        const text = await file.text();
        const lines = text.split("\n").filter((line) => line.trim());

        if (lines.length < 2) {
          setError("CSV file must have a header row and at least one data row");
          return;
        }

        // Parse header
        const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
        const requiredColumns = ["employee", "gross_pay"];
        const missingColumns = requiredColumns.filter(
          (col) => !header.includes(col)
        );

        if (missingColumns.length > 0) {
          setError(`Missing required columns: ${missingColumns.join(", ")}`);
          return;
        }

        // Parse data rows
        const entries: PayrollEntry[] = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(",").map((v) => v.trim());

          if (values.length !== header.length) continue;

          const row: Record<string, string> = {};
          header.forEach((col, idx) => {
            row[col] = values[idx];
          });

          entries.push({
            employeeName: row.employee || "",
            department: row.department || "",
            regularHours: parseFloat(row.regular_hours || row.hours || "80") || 80,
            overtimeHours: parseFloat(row.overtime_hours || row.ot || "0") || 0,
            grossPay: parseFloat(row.gross_pay || "0") || 0,
            deductions: parseFloat(row.deductions || row.withholdings || "0") || 0,
            netPay: parseFloat(row.net_pay || "0") || 0,
          });
        }

        // Calculate net pay if not provided
        entries.forEach((entry) => {
          if (entry.netPay === 0 && entry.grossPay > 0) {
            entry.netPay = entry.grossPay - entry.deductions;
          }
        });

        onUpload(entries);
      } catch {
        setError("Failed to parse CSV file");
      }
    },
    [onUpload]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  return (
    <div
      className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
        isDragging
          ? "border-blue-500 bg-blue-50"
          : "border-gray-300 hover:border-gray-400"
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
        <svg
          className="h-6 w-6 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
      </div>

      <p className="text-gray-600 mb-2">
        Drag and drop a CSV file here, or{" "}
        <label className="text-blue-600 hover:text-blue-700 cursor-pointer">
          browse
          <input
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </label>
      </p>

      <p className="text-xs text-gray-500">
        Required columns: employee, gross_pay
        <br />
        Optional: department, regular_hours, overtime_hours, deductions, net_pay
      </p>

      {error && (
        <p className="mt-4 text-sm text-red-600 bg-red-50 rounded-lg p-2">
          {error}
        </p>
      )}
    </div>
  );
}

export default ManualPayrollEntry;
