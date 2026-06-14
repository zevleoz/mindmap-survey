"use client";

import { useEffect, useState } from "react";
import { Download, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DIMENSIONS, PRESSURE_DIMENSIONS } from "@/lib/survey-data";

// 硬编码的管理密码（简单保护，非安全认证）
const ADMIN_PASSWORD = "admin12345";

interface RecordItem {
  id: string;
  name: string;
  age: number | null;
  school: string | null;
  gender: string | null;
  createdAt: string;
  scores: Record<string, unknown>;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function exportCSV(records: RecordItem[]) {
  const headers = [
    "姓名",
    "年龄",
    "学校",
    "性别",
    "提交时间",
    ...DIMENSIONS.map((d) => `学习力_${d}`),
    ...PRESSURE_DIMENSIONS.map((d) => `学业压力_${d}`),
  ];
  const rows = records.map((record) => {
    const learningPart = DIMENSIONS.map((dim) => {
      const v = record.scores[dim];
      return typeof v === "number" ? v.toFixed(1) : "";
    });
    const pressurePart = PRESSURE_DIMENSIONS.map((dim) => {
      const v = record.scores[`学业压力_${dim}`];
      return typeof v === "number" ? v.toFixed(1) : "";
    });
    return [
      record.name,
      record.age ?? "",
      record.school ?? "",
      record.gender ?? "",
      formatDate(record.createdAt),
      ...learningPart,
      ...pressurePart,
    ];
  });

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `学习力测评记录_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function AdminPage() {
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [authed, setAuthed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.sessionStorage.getItem("survey_admin_authed") === "1";
    } catch {
      return false;
    }
  });
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    if (!authed) return;
    async function fetchRecords() {
      try {
        const res = await fetch("/api/responses");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "加载失败");
        setRecords(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "加载失败");
      } finally {
        setLoading(false);
      }
    }
    fetchRecords();
  }, [authed]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim() === ADMIN_PASSWORD) {
      setAuthed(true);
      try {
        window.sessionStorage.setItem("survey_admin_authed", "1");
      } catch {
        // ignore
      }
      setPasswordError("");
    } else {
      setPasswordError("密码错误，请重试");
    }
  };

  if (!authed) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FBF7F0] to-white flex items-center justify-center p-5">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-md rounded-[20px] bg-white p-8 shadow-[0_2px_8px_rgba(184,115,51,0.1)]"
        >
          <div className="flex flex-col items-center gap-3 mb-6">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-amber-700 shadow-lg shadow-amber-200">
              <Lock className="size-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">管理后台登录</h1>
            <p className="text-sm text-slate-500 text-center">
              请输入管理员密码查看所有测评记录
            </p>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700"
              >
                密码
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入管理员密码"
                className="h-12 w-full rounded-xl border border-slate-200 bg-amber-50/40 px-4 text-base text-slate-800 outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-700/20"
                autoFocus
              />
              {passwordError && (
                <p className="text-sm text-rose-500">{passwordError}</p>
              )}
            </div>
            <Button
              type="submit"
              className="h-12 w-full rounded-2xl bg-amber-700 text-base font-semibold text-white hover:bg-amber-800"
            >
              登录
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FBF7F0] to-white">
      <main className="mx-auto max-w-[1400px] space-y-6 px-5 py-8">
        <div className="flex flex-col gap-4 rounded-[20px] bg-white p-6 shadow-[0_2px_8px_rgba(184,115,51,0.08)] sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-amber-800">测评管理后台</h1>
            <p className="mt-1 text-sm text-slate-500">
              查看所有学生的测评记录，支持导出 CSV
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              className="rounded-xl bg-amber-700 hover:bg-amber-800 text-white"
              disabled={records.length === 0}
              onClick={() => exportCSV(records)}
            >
              <Download className="size-4" />
              导出 CSV
            </Button>
          </div>
        </div>

        <div className="overflow-hidden rounded-[20px] bg-white shadow-[0_2px_8px_rgba(184,115,51,0.08)]">
          {loading ? (
            <p className="py-16 text-center text-slate-500">加载中...</p>
          ) : error ? (
            <p className="py-16 text-center text-rose-500">{error}</p>
          ) : records.length === 0 ? (
            <p className="py-16 text-center text-slate-500">暂无测评记录</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-white">姓名</TableHead>
                    <TableHead>年龄</TableHead>
                    <TableHead>学校</TableHead>
                    <TableHead>性别</TableHead>
                    <TableHead>提交时间</TableHead>
                    {DIMENSIONS.map((dim) => (
                      <TableHead key={dim} className="text-center">
                        {dim}
                      </TableHead>
                    ))}
                    {PRESSURE_DIMENSIONS.map((dim) => (
                      <TableHead key={`p-${dim}`} className="text-center">
                        压力·{dim}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="sticky left-0 bg-white font-medium">
                        {record.name}
                      </TableCell>
                      <TableCell className="text-slate-600">{record.age ?? "—"}</TableCell>
                      <TableCell className="max-w-[160px] truncate text-slate-600">
                        {record.school ?? "—"}
                      </TableCell>
                      <TableCell className="text-slate-600">{record.gender ?? "—"}</TableCell>
                      <TableCell className="text-slate-600">{formatDate(record.createdAt)}</TableCell>
                      {DIMENSIONS.map((dim) => {
                        const score = record.scores[dim];
                        const num = typeof score === "number" ? score : 0;
                        const isHigh = num >= 50;
                        return (
                          <TableCell
                            key={dim}
                            className={`text-center font-medium tabular-nums ${
                              isHigh ? "text-emerald-700" : "text-amber-800"
                            }`}
                          >
                            {typeof score === "number" ? num.toFixed(1) : "—"}
                          </TableCell>
                        );
                      })}
                      {PRESSURE_DIMENSIONS.map((dim) => {
                        const score = record.scores[`学业压力_${dim}`];
                        const num = typeof score === "number" ? score : 0;
                        const low = num < 3;
                        return (
                          <TableCell
                            key={`p-${dim}`}
                            className={`text-center font-medium tabular-nums ${
                              low ? "text-emerald-700" : "text-rose-600"
                            }`}
                          >
                            {typeof score === "number" ? num.toFixed(1) : "—"}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {!loading && records.length > 0 && (
          <p className="text-center text-sm text-slate-400">
            共 {records.length} 条记录
          </p>
        )}
      </main>
    </div>
  );
}
