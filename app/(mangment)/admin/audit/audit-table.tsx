"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";

type AuditLogItem = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  entityLabel: string | null;
  summary: string;
  routePath: string | null;
  method: string | null;
  ipAddress: string | null;
  metadata: unknown;
  actorRole: "CUSTOMER" | "ADMIN" | "PREPARER" | null;
  createdAt: string;
  actorUser: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
};

type AuditResponse = {
  data: AuditLogItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

const LIMIT = 20;

const actionOptions = [
  "ALL",
  "CREATE",
  "UPDATE",
  "DELETE",
  "STATUS_CHANGE",
  "ASSIGN",
  "RELEASE",
  "MARK_PREPARED",
  "ACCOUNT_UPDATE",
  "ACCOUNT_REGISTERED",
  "LOGIN_SUCCESS",
  "LOGIN_FAILED",
  "PASSWORD_RESET_REQUESTED",
  "PASSWORD_RESET_COMPLETED",
  "EMAIL_VERIFICATION_SENT",
  "EMAIL_VERIFIED",
] as const;

const entityTypeOptions = [
  "ALL",
  "USER",
  "CATEGORY",
  "PRODUCT",
  "OPTION_GROUP",
  "OPTION",
  "ORDER",
  "ORDER_ITEM",
  "EXCHANGE_RATE",
  "STORE_SETTINGS",
  "ACCOUNT",
  "FILE_UPLOAD",
  "AUTH",
] as const;

export default function AuditTable() {
  const { toast } = useToast();
  const [items, setItems] = useState<AuditLogItem[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [action, setAction] = useState<(typeof actionOptions)[number]>("ALL");
  const [entityType, setEntityType] =
    useState<(typeof entityTypeOptions)[number]>("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAuditLogs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(LIMIT),
      });

      if (query) params.set("q", query);
      if (action !== "ALL") params.set("action", action);
      if (entityType !== "ALL") params.set("entityType", entityType);

      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error ?? "No se pudo cargar la auditoria");
      }

      const payload = (await res.json()) as AuditResponse;
      setItems(payload.data ?? []);
      setTotal(payload.meta?.total ?? 0);
      setTotalPages(Math.max(1, payload.meta?.totalPages ?? 1));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error inesperado al cargar auditoria";
      setError(message);
      setItems([]);
      setTotal(0);
      setTotalPages(1);
      toast({
        title: "Error al cargar auditoria",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [action, entityType, page, query, toast]);

  useEffect(() => {
    void loadAuditLogs();
  }, [loadAuditLogs]);

  const visibleRangeLabel = useMemo(() => {
    if (total === 0 || items.length === 0) return "0 movimientos";
    const from = (page - 1) * LIMIT + 1;
    const to = from + items.length - 1;
    return `${from}-${to} de ${total} movimientos`;
  }, [items.length, page, total]);

  function handleSearchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPage(1);
    setQuery(searchInput.trim());
  }

  function formatActor(item: AuditLogItem) {
    if (!item.actorUser) return "Sistema";
    return item.actorUser.name?.trim() || item.actorUser.email || item.actorUser.id;
  }

  return (
    <section className="space-y-4">
      <div className="rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Auditoria de movimientos</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Registro de cambios administrativos por usuario, recurso y ruta.
        </p>

        <form onSubmit={handleSearchSubmit} className="mt-4 grid gap-3 md:grid-cols-4">
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar por usuario, resumen o ruta"
            className="md:col-span-2"
          />
          <Select
            value={action}
            onValueChange={(value) => {
              setAction(value as (typeof actionOptions)[number]);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Accion" />
            </SelectTrigger>
            <SelectContent>
              {actionOptions.map((item) => (
                <SelectItem key={item} value={item}>
                  {item === "ALL" ? "Todas las acciones" : item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={entityType}
            onValueChange={(value) => {
              setEntityType(value as (typeof entityTypeOptions)[number]);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Recurso" />
            </SelectTrigger>
            <SelectContent>
              {entityTypeOptions.map((item) => (
                <SelectItem key={item} value={item}>
                  {item === "ALL" ? "Todos los recursos" : item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="md:col-span-4">
            <Button type="submit" disabled={loading}>
              Buscar
            </Button>
          </div>
        </form>
      </div>

      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : (
        <p className="text-muted-foreground text-sm">{visibleRangeLabel}</p>
      )}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>Accion</TableHead>
              <TableHead>Recurso</TableHead>
              <TableHead>Resumen</TableHead>
              <TableHead>Ruta</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                  Cargando auditoria...
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                  No hay movimientos registrados.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="whitespace-nowrap">
                    {new Date(item.createdAt).toLocaleString("es-VE")}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p>{formatActor(item)}</p>
                      <p className="text-muted-foreground text-xs">
                        {item.actorRole ?? "SIN_ROL"}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{item.action}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p>{item.entityType}</p>
                      <p className="text-muted-foreground text-xs">
                        {item.entityLabel ?? item.entityId ?? "-"}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-md">
                    <p>{item.summary}</p>
                    {item.ipAddress ? (
                      <p className="text-muted-foreground text-xs">
                        IP: {item.ipAddress}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    <div className="space-y-1">
                      <p>{item.method ?? "-"}</p>
                      <p className="break-all">{item.routePath ?? "-"}</p>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => setPage((current) => Math.max(1, current - 1))}
          disabled={loading || page <= 1}
        >
          Anterior
        </Button>
        <p className="text-sm">
          Pagina {page} de {totalPages}
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
          disabled={loading || page >= totalPages}
        >
          Siguiente
        </Button>
      </div>
    </section>
  );
}
