import { Loader2Icon, Plus } from "lucide-react";
import { Button } from "@/shared/ui/button/Button";
import { Card } from "@/shared/ui/card/card";

export interface CreateGroupCardProps {
  value: string;
  onChange: (value: string) => void;
  onCreate: () => void;
  isCreating: boolean;
  placeholder?: string;
}

export function CreateGroupCard({
  value,
  onChange,
  onCreate,
  isCreating,
  placeholder = "E.g. Production, Client A...",
}: CreateGroupCardProps) {
  return (
    <Card className="p-6 border-dashed border-2 bg-slate-50/50 flex flex-col justify-between h-[200px] hover:bg-slate-50 transition-colors">
      <div>
        <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
          <Plus className="w-4 h-4 text-indigo-500" />
          New Group
        </h3>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-hidden transition-all"
          onKeyDown={(e) => e.key === "Enter" && onCreate()}
        />
      </div>
      <Button
        onClick={onCreate}
        disabled={isCreating || !value.trim()}
        variant="primary"
        className="w-full bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200"
      >
        {isCreating ? (
          <Loader2Icon className="w-4 h-4 animate-spin" />
        ) : (
          "Create Group"
        )}
      </Button>
    </Card>
  );
}
