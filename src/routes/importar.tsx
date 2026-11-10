import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { CheckCircle2, FileSpreadsheet, Lock, Upload, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useData } from "@/lib/data-context";
import { FileError, LIMITS, readWorkbook, type Workbook } from "@/lib/files";
import {
  autoMap,
  findReadingColumn,
  FIELD_LABELS,
  missingFields,
  REQUIRED_FIELDS,
  type Field,
  type Mapping,
  type Sheet,
} from "@/lib/analysis";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/importar")({
  head: () => ({
    meta: [
      { title: "Importar Planilha — Descarregamento SP" },
      {
        name: "description",
        content: "Importe Excel ou CSV; o processamento ocorre somente no navegador.",
      },
      { property: "og:title", content: "Importar Planilha — Descarregamento SP" },
      {
        property: "og:description",
        content: "Importe Excel ou CSV; o processamento ocorre somente no navegador.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const NONE = "__none__";
const FIELDS: Field[] = ["cte", "destino", "manifesto", "vols", "lidos"];

function Page() {
  const { setLoaded, spValues, setSpValues } = useData();
  const nav = useNavigate();
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [wb, setWb] = useState<Workbook | null>(null);
  const [sheetName, setSheetName] = useState("");
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [mapping, setMapping] = useState<Mapping | null>(null);
  const [ambiguous, setAmbiguous] = useState<Field[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sp, setSp] = useState(spValues.join(", "));
  const [maxRows, setMaxRows] = useState(LIMITS.maxRows);

  const loadSheet = (w: Workbook, name: string) => {
    const s = w.getSheet(name);
    const { mapping: m, candidates } = autoMap(s.headers);
    setSheetName(name);
    setSheet(s);
    setMapping(m);
    setAmbiguous(FIELDS.filter((f) => candidates[f].length > 1));
  };

  const handle = async (f: File) => {
    reset();
    setFile(f);
    setProgress(15);
    try {
      const w = await readWorkbook(f);
      setProgress(70);
      setWb(w);
      loadSheet(w, w.sheetNames[0]!);
      setProgress(100);
    } catch (e) {
      setProgress(0);
      setError(e instanceof FileError ? e.message : "Não foi possível processar o arquivo.");
    }
  };

  const reset = () => {
    setWb(null);
    setSheet(null);
    setMapping(null);
    setError(null);
    setFile(null);
    setProgress(0);
    setAmbiguous([]);
  };

  const readingColumn = sheet ? findReadingColumn(sheet.headers) : undefined;
  const missing = sheet && mapping ? missingFields(mapping, sheet.headers) : [];
  const limitError =
    sheet && sheet.rows.length > maxRows
      ? `A aba tem ${sheet.rows.length.toLocaleString("pt-BR")} linhas, acima do limite de ${maxRows.toLocaleString("pt-BR")}. Ajuste o limite de linhas abaixo (máximo de 1.000.000).`
      : null;
  const confirm = () => {
    if (!file || !sheet || !mapping || missing.length || error || limitError) return;
    const values = readingColumn
      ? ["SAO"]
      : sp
          .split(/[,;\n]/)
          .map((v) => v.trim())
          .filter(Boolean)
          .slice(0, 20);
    if (!values.length) {
      toast.error("Informe ao menos um valor de destino equivalente a SP.");
      return;
    }
    if (!readingColumn) setSpValues(values);
    setLoaded({ fileName: file.name, fileSize: file.size, sheetName, sheet, mapping });
    toast.success("Análise concluída.");
    nav({ to: "/" });
  };

  return (
    <>
      <PageHeader
        title="Importar planilha"
        subtitle="Excel (.xlsx, .xls) ou CSV. Nada é enviado para servidores."
      />
      <div className="mb-4 flex items-start gap-3 rounded-lg border bg-accent p-4 text-sm text-accent-foreground">
        <Lock className="mt-0.5 size-4 shrink-0" />O arquivo é lido apenas neste navegador e mantido
        somente na memória. Ao atualizar ou fechar a página, os dados são descartados. Macros e
        fórmulas não são executadas.
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files[0];
          if (f) handle(f);
        }}
        onClick={() => input.current?.click()}
        className={cn(
          "cursor-pointer rounded-lg border-2 border-dashed bg-card p-10 text-center transition-colors",
          drag ? "border-primary bg-accent" : "border-border hover:border-primary/50",
        )}
      >
        <Upload className="mx-auto size-8 text-primary" />
        <div className="mt-3 font-medium">Arraste o arquivo aqui ou clique para selecionar</div>
        <div className="mt-1 text-xs text-muted-foreground">
          Limite: {LIMITS.maxBytes / 1024 / 1024} MB · {maxRows.toLocaleString("pt-BR")} linhas
        </div>
        <input
          ref={input}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handle(f);
            e.target.value = "";
          }}
        />
      </div>

      {file && (
        <div className="mt-4 rounded-lg border bg-card p-4">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="size-5 text-primary" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{file.name}</div>
              <div className="text-xs text-muted-foreground">
                {(file.size / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} KB
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={reset}>
              <X /> Substituir
            </Button>
          </div>
          <Progress value={progress} className="mt-3 h-1.5" />
        </div>
      )}

      {(error || limitError) && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertTriangle className="size-4" /> {error || limitError}
        </div>
      )}

      {wb && sheet && mapping && (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
          <div className="space-y-5 rounded-lg border bg-card p-5">
            {wb.sheetNames.length > 1 && (
              <Field label="Aba do Excel">
                <Select
                  value={sheetName}
                  onValueChange={(v) => {
                    try {
                      loadSheet(wb, v);
                      setError(null);
                    } catch (e) {
                      setError(e instanceof FileError ? e.message : "Erro ao ler a aba.");
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {wb.sheetNames.map((n) => (
                      <SelectItem key={n} value={n}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
            <div>
              <div className="mb-2 text-sm font-semibold">Mapeamento de colunas</div>
              <div className="space-y-3">
                {FIELDS.map((f) => (
                  <Field
                    key={f}
                    label={
                      <>
                        {FIELD_LABELS[f]}{" "}
                        {REQUIRED_FIELDS.includes(f) ? (
                          <span className="text-destructive">*</span>
                        ) : (
                          <span className="text-muted-foreground">(opcional)</span>
                        )}
                      </>
                    }
                  >
                    <Select
                      disabled={f === "destino" && !!readingColumn}
                      value={mapping[f] ?? NONE}
                      onValueChange={(v) => setMapping({ ...mapping, [f]: v === NONE ? null : v })}
                    >
                      <SelectTrigger
                        className={cn(
                          REQUIRED_FIELDS.includes(f) && !mapping[f] && "border-destructive",
                          ambiguous.includes(f) && !mapping[f] && "border-warning",
                        )}
                      >
                        <SelectValue placeholder="Selecione a coluna" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>— Não mapeada —</SelectItem>
                        {sheet.headers.map((h) => (
                          <SelectItem key={h} value={h}>
                            {h}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {ambiguous.includes(f) && !mapping[f] && (
                      <p className="mt-1 text-xs text-warning-foreground">
                        Mais de uma coluna possível — escolha a correta.
                      </p>
                    )}
                  </Field>
                ))}
              </div>
            </div>
            {readingColumn ? (
              <div className="rounded-md border bg-accent p-3 text-sm text-accent-foreground">
                Filtro aplicado: leitura = SAO. Todos os trechos dessas linhas são mantidos,
                inclusive os que não terminam em SAO.
              </div>
            ) : (
              <Field label="Valores de destino equivalentes a SP">
                <Input value={sp} onChange={(e) => setSp(e.target.value)} maxLength={200} />
                <p className="mt-1 text-xs text-muted-foreground">
                  Separe por vírgula. Comparação sem acentos e maiúsculas. O prefixo do CT-e não é
                  usado.
                </p>
              </Field>
            )}
            <Field label="Limite de linhas">
              <Input
                type="number"
                min={100}
                max={1_000_000}
                value={maxRows}
                onChange={(e) =>
                  setMaxRows(
                    Math.max(100, Math.min(1_000_000, Number(e.target.value) || LIMITS.maxRows)),
                  )
                }
              />
            </Field>
            {missing.length > 0 ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                Colunas obrigatórias não mapeadas: {missing.map((m) => FIELD_LABELS[m]).join(", ")}.
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-success">
                <CheckCircle2 className="size-4" /> Estrutura válida.
              </div>
            )}
            <Button
              className="w-full"
              disabled={missing.length > 0 || !!error || !!limitError}
              onClick={confirm}
            >
              Analisar descarregamento
            </Button>
          </div>

          <div className="min-w-0 rounded-lg border bg-card">
            <div className="border-b px-4 py-3 text-sm font-semibold">
              Prévia · {sheet.rows.length.toLocaleString("pt-BR")} registros
            </div>
            <div className="overflow-auto max-h-[560px]">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted text-left text-muted-foreground">
                  <tr>
                    {sheet.headers.map((h) => {
                      const f = FIELDS.find((x) => mapping[x] === h);
                      return (
                        <th
                          key={h}
                          className={cn(
                            "whitespace-nowrap px-3 py-2",
                            f && "bg-accent text-accent-foreground",
                          )}
                        >
                          {h}
                          {f && <div className="text-[10px] font-normal">{FIELD_LABELS[f]}</div>}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {sheet.rows.slice(0, 20).map((r, i) => (
                    <tr key={i} className="border-t">
                      {sheet.headers.map((h) => (
                        <td key={h} className="whitespace-nowrap px-3 py-1.5">
                          {r[h]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}
