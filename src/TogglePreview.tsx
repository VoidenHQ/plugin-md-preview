import { BookOpen, Pencil } from "lucide-react";
import { create } from "zustand";

// "split" shows the live preview alongside the raw markdown source. Pressing
// the toggle again drops back to "edit" (raw source only, no preview).
export type MdViewMode = "edit" | "split";

export const useMdViewStore = create<{
  viewMode: MdViewMode;
  setViewMode: (mode: MdViewMode) => void;
}>((set) => ({
  viewMode: "edit",
  setViewMode: (viewMode) => set({ viewMode }),
}));

export const TogglePreview = ({ tab }: { tab: any }) => {
  const viewMode = useMdViewStore((state) => state.viewMode);
  const setViewMode = useMdViewStore((state) => state.setViewMode);

  const toggleMode = () => setViewMode(viewMode === "edit" ? "split" : "edit");

  return (
    <button
      className="p-1 hover:bg-active rounded-sm"
      onClick={toggleMode}
      title={viewMode === "edit" ? "Show preview" : "Hide preview"}
    >
      {viewMode === "edit" ? <BookOpen size={14} /> : <Pencil size={14} />}
    </button>
  );
};
