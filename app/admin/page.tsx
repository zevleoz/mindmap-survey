"use client";

import { useEffect, useState } from "react";
import { Download, Lock, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface StudentRow {
  id: string;
  name: string;
  age: number | null;
  school: string | null;
  gender: string | null;
  createdAt: string;
  responses: { id: string; createdAt: string }[];
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * 安全的 fetch：
 * - 检查 HTTP 状态码（res.ok）
 * - 检查 Content-Type 是不是 JSON（避免把 HTML 错误页当 JSON 解析）
 * - 解析失败时给一个可读错误
 */
async function safeFetchJson(url: string, options?: RequestInit) {
  const res = await fetch(url, options);
  const ct = res.headers.get("content-type") || "";
  const isJson = ct.includes("application/json");

  if (!res.ok) {
    let msg = `请求失败（${res.status}）`;
    if (isJson) {
      try {
        const data = await res.json();
        if (data?.error) msg = data.error;
      } catch {
        // 继续用默认错误信息
      }
    } else {
      // 服务端返回的是 HTML 错误页，直接报可读错误
      msg = `服务端异常（${res.status}），请稍后刷新重试`;
    }
    throw new Error(msg);
  }

  if (!isJson) {
    throw new Error("服务端返回数据格式异常，请稍后重试");
  }

  return res.json();
}

function exportCSV(records: StudentRow[]) {
  const headers = ["姓名", "年龄", "学校", "性别", "提交时间", "测评次数"];
  const rows = records.map((r) => [
    r.name,
    r.age ?? "",
    r.school ?? "",
    r.gender ?? "",
    formatDate(r.createdAt),
    String(r.responses?.length ?? 0),
  ]);
  const csvContent = [headers, ...rows]
    .map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    )
    .join("\n");
  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  link.download = `学习力测评记录_${yyyy}${mm}${dd}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function AdminPage() {
  const [records, setRecords] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dbFallback, setDbFallback] = useState(false);
  const [dbFallbackMessage, setDbFallbackMessage] = useState("");
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
  const [submitting, setSubmitting] = useState(false);

  // 搜索关键字
  const [keyword, setKeyword] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authed) return;
    async function fetchRecords() {
      try {
        const data = await safeFetchJson("/api/admin");
        if (Array.isArray(data?.students)) {
          setRecords(data.students);
        } else {
          setRecords([]);
        }
        if (data?._dbFallback === true) {
          setDbFallback(true);
          setDbFallbackMessage(data._message || "数据库未配置");
        } else {
          setDbFallback(false);
          setDbFallbackMessage("");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "加载失败");
      } finally {
        setLoading(false);
      }
    }
    fetchRecords();
  }, [authed]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!password.trim()) {
      setPasswordError("请输入密码");
      return;
    }
    setSubmitting(true);
    setPasswordError("");
    try {
      const data = await safeFetchJson("/api/admin-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!data?.success) {
        setPasswordError(data?.error || "密码错误");
        return;
      }
      try {
        window.sessionStorage.setItem("survey_admin_authed", "1");
      } catch {
        // ignore storage errors
      }
      setAuthed(true);
    } catch (err) {
      setPasswordError(
        err instanceof Error ? err.message : "验证失败，请稍后重试"
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!authed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#FBF7F0] to-white p-5">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-md rounded-[20px] bg-white p-8 shadow-[0_2px_8px_rgba(184,115,51,0.1)]"
        >
          <div className="mb-6 flex flex-col items-center gap-3">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-amber-700 shadow-lg shadow-amber-200">
              <Lock className="size-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">管理后台登录</h1>
            <p className="text-center text-sm text-slate-500">
              请输入管理员密码，查看所有学生的测评记录
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
                autoFocus
                className="h-12 w-full rounded-xl border border-slate-200 bg-amber-50/40 px-4 text-base text-slate-800 outline-none transition-all focus:border-amber-700 focus:ring-2 focus:ring-amber-700/20"
              />
              {passwordError && (
                <p className="text-sm text-rose-500">{passwordError}</p>
              )}
            </div>
            <Button
              type="submit"
              disabled={submitting}
              className="h-12 w-full rounded-2xl bg-amber-700 text-base font-semibold text-white hover:bg-amber-800 disabled:bg-slate-200 disabled:text-slate-400"
            >
              {submitting ? "验证中..." : "登录"}
            </Button>
          </div>
        </form>
      </div>
    );
  }

  const keywordLower = keyword.trim().toLowerCase();
  const filtered = keywordLower
    ? records.filter((r) =>
        (r.name ?? "").toLowerCase().includes(keywordLower) ||
        (r.school ?? "").toLowerCase().includes(keywordLower)
      )
    : records;

  const handleView = (record: StudentRow) => {
    const responseId = record.responses?.[0]?.id || record.id;
    const url = new URL("/", window.location.origin);
    url.searchParams.set("token", responseId);
    url.searchParams.set("from_admin", "1");
    window.open(url.toString(), "_blank", "noopener");
  };

  const handleDownload = async (record: StudentRow) => {
    setDownloadingId(record.id);
    try {
      const responseId = record.responses?.[0]?.id || record.id;
      const data = await safeFetchJson(`/api/responses/${encodeURIComponent(responseId)}`);

      const [{ default: html2canvas }, { default: jsPDF }, { PdfTemplate }] =
        await Promise.all([
          import("html2canvas"),
          import("jspdf"),
          import("@/components/survey/pdf-template"),
        ]);

      const container = document.createElement("div");
      container.style.position = "fixed";
      container.style.left = "-10000px";
      container.style.top = "0";
      container.style.width = "794px";
      container.style.zIndex = "-1";
      container.style.opacity = "0";
      container.style.pointerEvents = "none";
      document.body.appendChild(container);

      const { createRoot } = await import("react-dom/client");
      const root = createRoot(container);

      const dateStr = formatDate(record.createdAt).slice(0, 10);

      await new Promise<void>((resolve) => {
        root.render(
          <PdfTemplate
            name={data.name || record.name}
            scores={data.scores as never}
            dateStr={dateStr}
          />
        );
        requestAnimationFrame(() => setTimeout(() => resolve(), 150));
      });

      const templateEl = container.querySelector('[data-pdf-template]');
      if (!templateEl) throw new Error("PDF 模板未找到");

      const canvas = await html2canvas(templateEl as HTMLElement, {
        scale: 4,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      root.unmount();
      document.body.removeChild(container);

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "a4",
        compress: true,
      });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const safeName = String(record.name || "学生").replace(/[\\/:*?"<>|\s]/g, "_");
      pdf.save(`${safeName}_学习力测评报告_${dateStr}.pdf`);
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      alert(`PDF 生成失败：${msg}`);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FBF7F0] to-white">
      <main className="mx-auto max-w-[1400px] space-y-6 px-5 py-8">
        {dbFallback && (
          <div className="rounded-[20px] border border-amber-200 bg-amber-50 p-5 text-sm leading-relaxed text-amber-900">
            <div className="font-semibold text-amber-900">
              ⚠️ 数据库未配置（当前为降级模式）
            </div>
            <p className="mt-2">{dbFallbackMessage}</p>
            <p className="mt-2 text-amber-800">
              快速步骤：① 在 Vercel 项目设置 → Environment Variables 添加
              <code className="mx-1 rounded bg-white px-1.5 py-0.5 font-mono text-amber-900">DATABASE_URL</code>
              （推荐使用 Vercel Postgres / Neon / Supabase）；
              ② 在 Vercel CLI 或本地执行
              <code className="mx-1 rounded bg-white px-1.5 py-0.5 font-mono text-amber-900">prisma migrate deploy</code>
              ；③ 重新部署。
            </p>
          </div>
        )}
        <div className="flex flex-col gap-4 rounded-[20px] bg-white p-6 shadow-[0_2px_8px_rgba(184,115,51,0.08)] sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-amber-800">
              测评管理后台
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              共 {records.length} 条记录 · 支持搜索与导出
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="按姓名或学校搜索"
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-800 outline-none transition-all focus:border-amber-700 focus:ring-2 focus:ring-amber-700/20 sm:w-64"
              />
            </div>
            <Button
              className="rounded-xl bg-amber-700 text-white hover:bg-amber-800"
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
            <div className="py-16 text-center">
              <p className="text-rose-500">{error}</p>
              <button
                onClick={() => {
                  setLoading(true);
                  setError("");
                  fetch("/api/admin")
                    .then((r) => r.json())
                    .then((d) => {
                      if (Array.isArray(d?.students)) {
                        setRecords(d.students);
                      }
                    })
                    .catch(() => setError("加载失败"))
                    .finally(() => setLoading(false));
                }}
                className="mt-4 rounded-xl bg-amber-700 px-4 py-2 text-sm text-white hover:bg-amber-800"
              >
                重新加载
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-16 text-center text-slate-500">
              {keyword.trim() ? "没有匹配的记录" : "暂无测评记录"}
            </p>
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
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="sticky left-0 bg-white font-medium">
                        {record.name}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {record.age ?? "—"}
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate text-slate-600">
                        {record.school ?? "—"}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {record.gender ?? "—"}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {formatDate(record.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            onClick={() => handleView(record)}
                            disabled={!record.responses?.length}
                            className="h-9 rounded-xl text-sm"
                          >
                            查看结果
                          </Button>
                          <Button
                            onClick={() => handleDownload(record)}
                            disabled={
                              downloadingId === record.id ||
                              !record.responses?.length
                            }
                            className="h-9 rounded-xl bg-amber-700 text-sm text-white hover:bg-amber-800 disabled:bg-slate-200 disabled:text-slate-400"
                          >
                            <Download className="size-4" />
                            {downloadingId === record.id ? "生成中..." : "下载 PDF"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
