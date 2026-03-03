"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
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

type UserRole = "CUSTOMER" | "ADMIN";

type AdminUser = {
  id: string;
  name: string | null;
  email: string | null;
  role: UserRole;
  emailVerified: string | null;
  image: string | null;
};

type UsersResponse = {
  data: AdminUser[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

const LIMIT = 10;

export default function UsersTable() {
  const { toast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(LIMIT),
      });
      if (query) params.set("q", query);

      const res = await fetch(`/api/admin/users?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error ?? "No se pudo cargar la lista de usuarios");
      }

      const payload = (await res.json()) as UsersResponse;
      setUsers(payload.data ?? []);
      setTotal(payload.meta?.total ?? 0);
      setTotalPages(Math.max(1, payload.meta?.totalPages ?? 1));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error inesperado al cargar usuarios";
      setError(message);
      toast({
        title: "Error al cargar usuarios",
        description: message,
        variant: "destructive",
      });
      setUsers([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, query, toast]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const visibleRangeLabel = useMemo(() => {
    if (total === 0 || users.length === 0) return "0 resultados";
    const from = (page - 1) * LIMIT + 1;
    const to = from + users.length - 1;
    return `${from}-${to} de ${total} usuarios`;
  }, [page, total, users.length]);

  async function handleRoleChange(userId: string, role: UserRole) {
    setSavingUserId(userId);
    setError(null);

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error ?? "No se pudo actualizar el rol");
      }

      setUsers((prev) =>
        prev.map((user) => (user.id === userId ? { ...user, role } : user)),
      );
      toast({
        title: "Rol actualizado",
        description: `El usuario ahora tiene rol ${role}.`,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al actualizar el rol";
      setError(message);
      toast({
        title: "No se pudo actualizar el rol",
        description: message,
        variant: "destructive",
      });
      await loadUsers();
    } finally {
      setSavingUserId(null);
    }
  }

  function handleSearchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPage(1);
    setQuery(searchInput.trim());
  }

  return (
    <section className="space-y-4">
      <form onSubmit={handleSearchSubmit} className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Buscar por email o nombre"
          className="sm:max-w-sm"
        />
        <Button type="submit" disabled={loading}>
          Buscar
        </Button>
      </form>

      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : (
        <p className="text-muted-foreground text-sm">{visibleRangeLabel}</p>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Verificado</TableHead>
            <TableHead>Rol</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={4} className="text-muted-foreground py-8 text-center">
                Cargando usuarios...
              </TableCell>
            </TableRow>
          ) : users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-muted-foreground py-8 text-center">
                No hay usuarios para mostrar
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.name?.trim() || "-"}</TableCell>
                <TableCell>{user.email ?? "-"}</TableCell>
                <TableCell>
                  {user.emailVerified ? (
                    <Badge variant="success">Verificado</Badge>
                  ) : (
                    <Badge variant="warning">Pendiente</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Select
                    value={user.role}
                    disabled={savingUserId === user.id}
                    onValueChange={(value) =>
                      handleRoleChange(user.id, value as UserRole)
                    }
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Rol" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CUSTOMER">CUSTOMER</SelectItem>
                      <SelectItem value="ADMIN">ADMIN</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
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
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={loading || page >= totalPages}
        >
          Siguiente
        </Button>
      </div>
    </section>
  );
}
