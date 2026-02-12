import { createFileRoute } from "@tanstack/react-router";
import clsx from "clsx";
import { ArrowDownCircle, ArrowUpCircle, CheckCircle2, Settings, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { DomainStatusWithUrl } from "@/entities/domain/types/domain_status";
import { invokeApi } from "@/shared/api";
import { Button } from "@/shared/ui/button/Button";
import { Card } from "@/shared/ui/card/card";
import { H1, P } from "@/shared/ui/typography/typography";

export const Route = createFileRoute("/status/settings")({
  component: StatusSettings,
});

function StatusSettings() {
  const [list, setList] = useState<DomainStatusWithUrl[]>([]);
  const [selectedChecked, setSelectedChecked] = useState<Set<number>>(new Set());
  const [selectedUnchecked, setSelectedUnchecked] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await invokeApi("get_domain_status_list");
      if (res.success && res.data) {
        setList(res.data);
      }
    } catch (e) {
      console.error("get_domain_status_list:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const checked = list.filter((d) => d.checkEnabled);
  const unchecked = list.filter((d) => !d.checkEnabled);

  const toggleChecked = (id: number) => {
    setSelectedChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleUnchecked = (id: number) => {
    setSelectedUnchecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAllChecked = () => {
    setSelectedChecked(new Set(checked.map((d) => d.domainId)));
  };

  const selectAllUnchecked = () => {
    setSelectedUnchecked(new Set(unchecked.map((d) => d.domainId)));
  };

  const handleDisable = async () => {
    const ids = Array.from(selectedChecked);
    if (ids.length === 0) {
      return;
    }
    try {
      await invokeApi("set_domain_status_check_enabled", {
        payload: { domainIds: ids, enabled: false },
      });
      setSelectedChecked(new Set());
      await fetchList();
    } catch (e) {
      console.error("set_domain_status_check_enabled:", e);
    }
  };

  const handleEnable = async () => {
    const ids = Array.from(selectedUnchecked);
    if (ids.length === 0) {
      return;
    }
    try {
      await invokeApi("set_domain_status_check_enabled", {
        payload: { domainIds: ids, enabled: true },
      });
      setSelectedUnchecked(new Set());
      await fetchList();
    } catch (e) {
      console.error("set_domain_status_check_enabled:", e);
    }
  };

  const ListItem = ({
    item,
    selected,
    onToggle,
  }: {
    item: DomainStatusWithUrl;
    selected: boolean;
    onToggle: () => void;
  }) => (
    <label
      className={clsx(
        "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors",
        selected ? "bg-violet-50 border border-violet-200" : "hover:bg-slate-50",
      )}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggle}
        className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
      />
      <span className="text-sm font-medium text-slate-700 truncate flex-1">{item.url}</span>
    </label>
  );

  return (
    <div className="flex flex-col gap-8 pb-20">
      <header>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-violet-100 text-violet-600 rounded-lg">
            <Settings className="w-5 h-5" />
          </div>
          <H1>Status Check Settings</H1>
        </div>
        <P className="text-slate-500">
          체크할 도메인과 체크하지 않을 도메인을 선택하세요. 여러 개 선택 후 버튼으로 일괄 업데이트할 수 있습니다.
        </P>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 bg-white border-slate-200 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <h2 className="font-bold text-slate-800">체크할 도메인 ({checked.length})</h2>
            </div>
            <Button variant="secondary" size="sm" onClick={selectAllChecked} disabled={checked.length === 0}>
              전체 선택
            </Button>
          </div>
          <p className="text-xs text-slate-500 mb-4">백그라운드에서 주기적으로 상태를 체크합니다.</p>
          <div className="flex flex-col gap-2 max-h-64 overflow-y-auto grow">
            {checked.length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center grow flex items-center justify-center">
                등록된 도메인이 없습니다.
              </p>
            ) : (
              checked.map((item) => (
                <ListItem
                  key={item.domainId}
                  item={item}
                  selected={selectedChecked.has(item.domainId)}
                  onToggle={() => toggleChecked(item.domainId)}
                />
              ))
            )}
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="mt-4 w-full gap-2 flex items-center justify-center justify-self-end"
            onClick={handleDisable}
            disabled={selectedChecked.size === 0}
          >
            <ArrowDownCircle className="w-4 h-4 shrink-0" />
            선택 항목 → 체크 안함 ({selectedChecked.size})
          </Button>
        </Card>

        <Card className="p-6 bg-white border-slate-200 flex flex-col h-full">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-slate-400" />
              <h2 className="font-bold text-slate-800">체크 안할 도메인 ({unchecked.length})</h2>
            </div>
            <Button variant="secondary" size="sm" onClick={selectAllUnchecked} disabled={unchecked.length === 0}>
              전체 선택
            </Button>
          </div>
          <p className="text-xs text-slate-500 mb-4">상태 체크에서 제외됩니다. 수동으로 Refresh 시에만 체크됩니다.</p>
          <div className="flex flex-col gap-2 max-h-64 overflow-y-auto grow">
            {unchecked.length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center grow flex items-center justify-center">
                모든 도메인이 체크 대상입니다.
              </p>
            ) : (
              unchecked.map((item) => (
                <ListItem
                  key={item.domainId}
                  item={item}
                  selected={selectedUnchecked.has(item.domainId)}
                  onToggle={() => toggleUnchecked(item.domainId)}
                />
              ))
            )}
          </div>
          <Button
            variant="primary"
            size="sm"
            className="mt-4 w-full gap-2 flex items-center justify-center justify-self-end"
            onClick={handleEnable}
            disabled={selectedUnchecked.size === 0}
          >
            <ArrowUpCircle className="w-4 h-4 shrink-0" />
            선택 항목 → 체크함 ({selectedUnchecked.size})
          </Button>
        </Card>
      </div>

      {loading && <p className="text-sm text-slate-500 text-center">로딩 중...</p>}
    </div>
  );
}
