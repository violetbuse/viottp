import { save, open } from "@tauri-apps/plugin-dialog";
import { Download, Upload } from "lucide-react";
import { IconButton } from "../../components/ui";
import * as api from "../../lib/tauri-api";
import { errorMessage } from "../../lib/tauri-api";
import { useEnvironmentsStore } from "../../stores/environments-store";
import { useVariablesStore } from "../../stores/variables-store";
import { useSavedRequestsStore } from "../../stores/saved-requests-store";

export function ImportExportPanel() {
  const refreshEnvironments = useEnvironmentsStore((s) => s.refresh);
  const loadGlobal = useVariablesStore((s) => s.loadGlobal);
  const refreshSaved = useSavedRequestsStore((s) => s.refresh);

  async function handleExport() {
    const path = await save({
      title: "Export viottp data",
      defaultPath: "viottp-export.json",
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (!path) return;
    try {
      await api.exportData(path);
    } catch (err) {
      window.alert(`Export failed: ${errorMessage(err)}`);
    }
  }

  async function handleImport() {
    const path = await open({
      title: "Import viottp data",
      multiple: false,
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (!path || Array.isArray(path)) return;
    const replace = window.confirm(
      "Replace all existing environments/variables/saved requests with the imported file?\n\nCancel to merge (import as new copies) instead.",
    );
    try {
      const summary = await api.importData(path, replace ? "replace" : "merge");
      window.alert(
        `Imported ${summary.environments_imported} environments, ${summary.variables_imported} variables, ${summary.saved_requests_imported} saved requests.`,
      );
      await Promise.all([refreshEnvironments(), loadGlobal(), refreshSaved()]);
    } catch (err) {
      window.alert(`Import failed: ${errorMessage(err)}`);
    }
  }

  return (
    <div className="flex items-center justify-center gap-1 border-t border-line p-1.5">
      <IconButton label="Export data" onClick={handleExport}>
        <Download size={14} />
      </IconButton>
      <IconButton label="Import data" onClick={handleImport}>
        <Upload size={14} />
      </IconButton>
    </div>
  );
}
