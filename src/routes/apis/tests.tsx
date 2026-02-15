import { createFileRoute } from "@tanstack/react-router";
import { Play, Search, Trash2, Wifi } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { ApiTestCase } from "@/entities/proxy/types/local_route";
import { invokeApi } from "@/shared/api";
import { Button } from "@/shared/ui/button/Button";
import { Card } from "@/shared/ui/card/card";
import { Input } from "@/shared/ui/input/Input";
import { H1, P } from "@/shared/ui/typography/typography";
import { Badge } from "@/shared/ui/badge/badge";

export const Route = createFileRoute("/apis/tests")({
  component: ApiTestsPage,
});

function ApiTestsPage() {
  const [tests, setTests] = useState<ApiTestCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Record<string, { running: boolean; ok?: boolean; status?: number; msg?: string }>>({});

  const fetchTests = useCallback(async () => {
    try {
      const res = await invokeApi("get_api_test_cases");
      if (res.success) {
        setTests(res.data ?? []);
      }
    } catch (e) {
      console.error("get_api_test_cases:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTests();
  }, [fetchTests]);

  const handleRun = async (test: ApiTestCase) => {
    setResults(prev => ({ ...prev, [test.id]: { running: true } }));
    try {
      const res = await invokeApi("send_api_request", {
        payload: {
          method: test.method,
          url: test.url,
          headers: test.headers,
          body: test.body,
        }
      });
      const ok = res.success && res.data && (!test.expectedStatus || res.data.statusCode === test.expectedStatus);
      setResults(prev => ({
        ...prev,
        [test.id]: {
          running: false,
          ok,
          status: res.data?.statusCode,
          msg: res.message
        }
      }));
    } catch (e) {
      setResults(prev => ({
        ...prev,
        [test.id]: { running: false, ok: false, msg: String(e) }
      }));
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm("Remove this test case?")) return;
    try {
      const res = await invokeApi("remove_api_test_case", { payload: { id } });
      if (res.success) fetchTests();
    } catch (e) {
      console.error(e);
    }
  };

  const filteredTests = tests.filter(t => t.name.toLowerCase().includes(search.toLowerCase()) || t.url.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-col gap-8 pb-20">
      <header>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
            <Wifi className="w-5 h-5" />
          </div>
          <H1>API Regression Tests</H1>
        </div>
        <P className="text-slate-500">저장된 API 테스트 케이스를 실행하고 결과를 확인합니다.</P>
      </header>

      <Card className="p-4 md:p-6 bg-white border-slate-200">
        <div className="flex justify-between items-center mb-6">
          <div className="relative w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-10 h-9"
              placeholder="Search tests..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20 text-slate-400">Loading tests...</div>
        ) : filteredTests.length === 0 ? (
          <div className="text-center py-20 text-slate-400">No test cases found.</div>
        ) : (
          <div className="space-y-4">
            {filteredTests.map(test => {
              const res = results[test.id];
              return (
                <div key={test.id} className="p-4 rounded-xl border border-slate-100 flex items-center gap-4 hover:border-emerald-100 transition-colors">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-800 truncate">{test.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={{ color: "slate", size: "sm" }}>{test.method}</Badge>
                      <code className="text-[10px] text-slate-400 truncate">{test.url}</code>
                    </div>
                  </div>

                  {res && (
                    <div className={`px-3 py-1 rounded-lg text-xs font-bold ${res.running ? "bg-slate-100 animate-pulse" : res.ok ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {res.running ? "Running..." : res.ok ? `Passed (${res.status})` : `Failed (${res.status ?? 'Error'})`}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Button variant="primary" size="sm" className="h-8 w-8 p-0" onClick={() => handleRun(test)} disabled={res?.running}>
                      <Play className="w-4 h-4" />
                    </Button>
                    <Button variant="danger" size="sm" className="h-8 w-8 p-0" onClick={() => handleRemove(test.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
