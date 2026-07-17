import { Pencil, Eye, Columns2 } from "lucide-react";
import { create } from "zustand";

// "edit" shows the raw markdown source only. "preview" shows the rendered
// markdown only. "split" shows both side by side.
export type MdViewMode = "edit" | "preview" | "split";

export const useMdViewStore = create<{
  viewMode: MdViewMode;
  setViewMode: (mode: MdViewMode) => void;
}>((set) => ({
  viewMode: "edit",
  setViewMode: (viewMode) => set({ viewMode }),
}));

const MODES: { mode: MdViewMode; label: string; icon: typeof Pencil }[] = [
  { mode: "edit", label: "Markdown", icon: Pencil },
  { mode: "preview", label: "Preview", icon: Eye },
  { mode: "split", label: "Both", icon: Columns2 },
];

export const TogglePreview = ({ tab }: { tab: any }) => {
  const viewMode = useMdViewStore((state) => state.viewMode);
  const setViewMode = useMdViewStore((state) => state.setViewMode);

  return (
    <div className="flex items-center gap-0.5 p-0.5 rounded-sm bg-active/40">
      {MODES.map(({ mode, label, icon: Icon }) => (
        <button
          key={mode}
          className={`p-1 rounded-sm ${viewMode === mode ? "bg-active text-text" : "text-comment hover:bg-active/60"}`}
          onClick={() => setViewMode(mode)}
          title={label}
        >
          <Icon size={14} />
        </button>
      ))}
    </div>
  );
};
