import { useRef, useState } from "react";
import { Paperclip, X, Loader2, FileText, CheckCircle2, AlertCircle, Eye, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface DocFile {
  name: string;
  objectPath: string;
  contentType: string;
  size: number;
}

interface DocUploaderProps {
  label?: string;
  files: DocFile[];
  onChange: (files: DocFile[]) => void;
  disabled?: boolean;
  accept?: string;
}

interface UploadingFile {
  id: string;
  name: string;
  progress: "uploading" | "done" | "error";
  error?: string;
}

function objectPathToUrl(objectPath: string): string {
  if (!objectPath.startsWith("/objects/")) return objectPath;
  const rest = objectPath.slice("/objects/".length);
  return `/api/storage/objects/${rest}`;
}

async function downloadFile(file: DocFile) {
  const url = objectPathToUrl(file.objectPath);
  try {
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) throw new Error("Falha ao baixar arquivo");
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
  } catch {
    alert("Não foi possível baixar o arquivo.");
  }
}

function viewFile(file: DocFile) {
  const url = objectPathToUrl(file.objectPath);
  window.open(url, "_blank", "noopener,noreferrer");
}

export function DocUploader({ label = "Documentos", files, onChange, disabled, accept = "*/*" }: DocUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<UploadingFile[]>([]);
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleFiles = async (selected: FileList) => {
    const arr = Array.from(selected);
    if (!arr.length) return;

    const newUploading: UploadingFile[] = arr.map(f => ({ id: `${f.name}-${Date.now()}`, name: f.name, progress: "uploading" as const }));
    setUploading(prev => [...prev, ...newUploading]);

    const results: DocFile[] = [];

    for (let i = 0; i < arr.length; i++) {
      const file = arr[i];
      const uid = newUploading[i].id;
      try {
        const res = await fetch("/api/storage/uploads/request-url", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type || "application/octet-stream" }),
        });
        if (!res.ok) throw new Error("Falha ao obter URL de upload");
        const { uploadURL, objectPath } = await res.json();

        const put = await fetch(uploadURL, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type || "application/octet-stream" },
        });
        if (!put.ok) throw new Error("Falha ao enviar arquivo");

        results.push({ name: file.name, objectPath, contentType: file.type || "application/octet-stream", size: file.size });

        setUploading(prev => prev.map(u => u.id === uid ? { ...u, progress: "done" } : u));
      } catch (err) {
        setUploading(prev => prev.map(u => u.id === uid ? { ...u, progress: "error", error: err instanceof Error ? err.message : "Erro" } : u));
      }
    }

    if (results.length > 0) onChange([...files, ...results]);

    setTimeout(() => {
      setUploading(prev => prev.filter(u => u.progress === "uploading"));
    }, 2000);

    if (inputRef.current) inputRef.current.value = "";
  };

  const removeFile = (idx: number) => {
    onChange(files.filter((_, i) => i !== idx));
  };

  const handleDownload = async (f: DocFile) => {
    setDownloading(f.objectPath);
    await downloadFile(f);
    setDownloading(null);
  };

  const formatBytes = (b: number) => {
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
    return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isViewable = (f: DocFile) =>
    f.contentType.startsWith("image/") || f.contentType === "application/pdf";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="h-7 gap-1.5 text-xs"
        >
          <Paperclip className="h-3.5 w-3.5" />
          Adicionar arquivo
        </Button>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        className="hidden"
        onChange={e => e.target.files && handleFiles(e.target.files)}
        disabled={disabled}
      />

      {(files.length > 0 || uploading.length > 0) && (
        <div className="space-y-1.5 rounded-lg border bg-muted/20 p-2">
          {files.map((f, i) => (
            <div key={`${f.objectPath}-${i}`} className="flex items-center gap-2 rounded-md bg-background border px-2 py-1.5">
              <FileText className="h-3.5 w-3.5 text-blue-500 shrink-0" />
              <span className="text-xs font-medium flex-1 truncate min-w-0" title={f.name}>{f.name}</span>
              <span className="text-xs text-muted-foreground shrink-0">{formatBytes(f.size)}</span>

              {/* Visualizar — só para imagens e PDF */}
              {isViewable(f) && (
                <button
                  type="button"
                  title="Visualizar"
                  onClick={() => viewFile(f)}
                  className="text-muted-foreground hover:text-blue-600 transition-colors ml-1 shrink-0"
                >
                  <Eye className="h-3.5 w-3.5" />
                </button>
              )}

              {/* Baixar */}
              <button
                type="button"
                title="Baixar"
                onClick={() => handleDownload(f)}
                disabled={downloading === f.objectPath}
                className="text-muted-foreground hover:text-green-600 transition-colors shrink-0"
              >
                {downloading === f.objectPath
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Download className="h-3.5 w-3.5" />
                }
              </button>

              {/* Remover */}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  title="Remover"
                  className="text-muted-foreground hover:text-red-500 transition-colors ml-0.5 shrink-0"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}

          {uploading.map(u => (
            <div key={u.id} className="flex items-center gap-2 rounded-md bg-background border px-2 py-1.5">
              {u.progress === "uploading" && <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin shrink-0" />}
              {u.progress === "done" && <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />}
              {u.progress === "error" && <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />}
              <span className="text-xs text-muted-foreground flex-1 truncate">{u.name}</span>
              {u.progress === "uploading" && <span className="text-xs text-blue-500 shrink-0">Enviando...</span>}
              {u.progress === "error" && <span className="text-xs text-red-500 shrink-0">{u.error}</span>}
            </div>
          ))}
        </div>
      )}

      {files.length === 0 && uploading.length === 0 && (
        <div
          className="border-2 border-dashed rounded-lg p-3 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
          onClick={() => !disabled && inputRef.current?.click()}
        >
          <Paperclip className="h-4 w-4 mx-auto mb-1 text-muted-foreground opacity-50" />
          <p className="text-xs text-muted-foreground">Clique para selecionar ou arraste arquivos</p>
          <p className="text-xs text-muted-foreground/60 mt-0.5">PDF, JPG, PNG — qualquer formato</p>
        </div>
      )}
    </div>
  );
}
