import { createFileRoute } from "@tanstack/react-router";
import { Plus, Search, Trash2, Wifi, WifiOff } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { ApiMock } from "@/entities/proxy/types/local_route";
import { invokeApi } from "@/shared/api";
import { Button } from "@/shared/ui/button/Button";
import { Card } from "@/shared/ui/card/card";
import { Input } from "@/shared/ui/input/Input";
import { H1, P } from "@/shared/ui/typography/typography";

export const Route = createFileRoute("/apis/mocks")({
  component: ApiMocksPage,
});

function ApiMocksPage() {
  const [mocks, setMocks] = useState<ApiMock[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchMocks = useCallback(async () => {
    try {
      const res = await invokeApi("get_api_mocks");
      if (res.success) {
        setMocks(res.data ?? []);
      }
    } catch (e) {
      console.error("get_api_mocks:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMocks();
  }, [fetchMocks]);

  const handleToggleEnabled = async (mock: ApiMock) => {
    try {
      const res = await invokeApi("update_api_mock", {
        payload: { ...mock, enabled: !mock.enabled },
      });
      if (res.success) {
        fetchMocks();
      }
    } catch (e) {
      console.error("update_api_mock:", e);
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm("Are you sure you want to remove this mock?")) return;
    try {
      const res = await invokeApi("remove_api_mock", { payload: { id } });
      if (res.success) {
        fetchMocks();
      }
    } catch (e) {
      console.error("remove_api_mock:", e);
    }
  };

  const filteredMocks = mocks.filter(
    (m) =>
      m.host.toLowerCase().includes(search.toLowerCase()) ||
      m.path.toLowerCase().includes(search.toLowerCase()) ||
      m.method.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-8 pb-20">
      <header className="flex justify-between items-end">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-pink-100 text-pink-600 rounded-lg">
              <Wifi className="w-5 h-5" />
            </div>
            <H1>API Mocks</H1>
          </div>
          <P className="text-slate-500">
            등록된 호스트와 경로로 요청이 올 때 미리 정의된 응답을 반환합니다. 프록시 로컬 라우팅 설정보다 우선순위가
            높습니다.
          </P>
        </div>
      </header>

      <Card className="p-4 md:p-6 bg-white border-slate-200">
        <div className="flex justify-between items-center mb-6">
          <div className="relative w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-10 h-9"
              placeholder="Search host, path, method..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20 text-slate-400 font-medium">Loading mocks...</div>
        ) : filteredMocks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-slate-50 rounded-xl border border-dashed">
            <WifiOff className="w-12 h-12 opacity-10 mb-2" />
            <p>No mock rules found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredMocks.map((mock) => (
              <div
                key={mock.id}
                className={`p-4 rounded-xl border transition-all ${
                  mock.enabled ? "border-indigo-100 bg-white shadow-sm" : "border-slate-100 bg-slate-50 opacity-60"
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      mock.method === "GET"
                        ? "bg-green-100 text-green-700"
                        : mock.method === "POST"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {mock.method}
                  </span>
                  <code className="text-sm font-bold text-slate-800 flex-1 truncate">{mock.host}{mock.path}</code>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={mock.enabled}
                        onChange={() => handleToggleEnabled(mock)}
                        className="w-4 h-4 accent-indigo-600"
                      />
                      <span className="text-xs text-slate-500 font-medium">{mock.enabled ? "Enabled" : "Disabled"}</span>
                    </label>
                    <Button
                      variant="danger"
                      size="sm"
                      className="p-1.5 h-8 w-8"
                      onClick={() => handleRemove(mock.id)}
                      title="Remove mock"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Response Status</p>
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${mock.status_code < 300 ? "bg-green-500" : "bg-amber-500"}`}
                      />
                      <span className="text-sm font-mono font-bold text-slate-700">{mock.status_code}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Body Size</p>
                    <p className="text-sm font-mono text-slate-700">{mock.response_body.length} chars</p>
                  </div>
                </div>

                <div className="mt-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Body Preview</p>
                  <pre className="text-[10px] bg-slate-900 text-indigo-200 p-2 rounded-lg font-mono truncate max-h-20 overflow-hidden">
                    {mock.response_body}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
