"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { formatCentsToMajorUnit, parseMajorUnitToCents } from "@/lib/money";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type OptionGroup = {
  id: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  _count: {
    options: number;
    products: number;
  };
};

type OptionItem = {
  id: string;
  groupId: string;
  name: string;
  priceDeltaCents: number;
  sortOrder: number;
  isActive: boolean;
};

type ListResponse<T> = {
  data: T[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type GroupForm = {
  name: string;
  minSelect: string;
  maxSelect: string;
  sortOrder: string;
  isActive: "ACTIVE" | "INACTIVE";
};

type OptionForm = {
  name: string;
  priceDelta: string;
  sortOrder: string;
  isActive: "ACTIVE" | "INACTIVE";
};

const LIMIT = 10;

const emptyGroupForm: GroupForm = {
  name: "",
  minSelect: "0",
  maxSelect: "1",
  sortOrder: "",
  isActive: "ACTIVE",
};

const emptyOptionForm: OptionForm = {
  name: "",
  priceDelta: "0.00",
  sortOrder: "",
  isActive: "ACTIVE",
};

function formatMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function OptionGroupsTable() {
  const { toast } = useToast();
  const [groups, setGroups] = useState<OptionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<OptionGroup | null>(null);
  const [groupForm, setGroupForm] = useState<GroupForm>(emptyGroupForm);
  const [savingGroup, setSavingGroup] = useState(false);

  const [optionsDialogOpen, setOptionsDialogOpen] = useState(false);
  const [optionsGroup, setOptionsGroup] = useState<OptionGroup | null>(null);
  const [options, setOptions] = useState<OptionItem[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [editingOption, setEditingOption] = useState<OptionItem | null>(null);
  const [optionForm, setOptionForm] = useState<OptionForm>(emptyOptionForm);
  const [savingOption, setSavingOption] = useState(false);

  const loadGroups = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(LIMIT),
      });
      if (query) params.set("q", query);

      const res = await fetch(`/api/admin/option-groups?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error ?? "No se pudieron cargar los grupos de opciones");
      }

      const payload = (await res.json()) as ListResponse<OptionGroup>;
      setGroups(payload.data ?? []);
      setTotal(payload.meta?.total ?? 0);
      setTotalPages(Math.max(1, payload.meta?.totalPages ?? 1));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error inesperado al cargar grupos";
      setError(message);
      toast({
        title: "Error al cargar grupos de opciones",
        description: message,
        variant: "destructive",
      });
      setGroups([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, query, toast]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const visibleRange = useMemo(() => {
    if (total === 0 || groups.length === 0) return "0 resultados";
    const from = (page - 1) * LIMIT + 1;
    const to = from + groups.length - 1;
    return `${from}-${to} de ${total} grupos`;
  }, [page, total, groups.length]);

  function openCreateGroup() {
    setEditingGroup(null);
    setGroupForm(emptyGroupForm);
    setGroupDialogOpen(true);
  }

  function openEditGroup(group: OptionGroup) {
    setEditingGroup(group);
    setGroupForm({
      name: group.name,
      minSelect: String(group.minSelect),
      maxSelect: String(group.maxSelect),
      sortOrder: String(group.sortOrder),
      isActive: group.isActive ? "ACTIVE" : "INACTIVE",
    });
    setGroupDialogOpen(true);
  }

  async function submitGroup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSavingGroup(true);
    setError(null);

    try {
      const payload = {
        name: groupForm.name.trim(),
        minSelect: Number.parseInt(groupForm.minSelect, 10),
        maxSelect: Number.parseInt(groupForm.maxSelect, 10),
        sortOrder: groupForm.sortOrder.trim()
          ? Number.parseInt(groupForm.sortOrder, 10)
          : undefined,
        isActive: groupForm.isActive === "ACTIVE",
      };

      const isEdit = Boolean(editingGroup);
      const res = await fetch(
        isEdit
          ? `/api/admin/option-groups/${editingGroup!.id}`
          : "/api/admin/option-groups",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error ?? "No se pudo guardar el grupo de opciones");
      }

      setGroupDialogOpen(false);
      setEditingGroup(null);
      setGroupForm(emptyGroupForm);
      toast({
        title: isEdit ? "Grupo de opciones actualizado" : "Grupo de opciones creado",
        description: "Los cambios se guardaron correctamente.",
      });
      await loadGroups();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error inesperado al guardar el grupo";
      setError(message);
      toast({
        title: "No se pudo guardar el grupo de opciones",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSavingGroup(false);
    }
  }

  async function loadOptions(group: OptionGroup) {
    setOptionsGroup(group);
    setOptionsDialogOpen(true);
    setOptionsLoading(true);
    setEditingOption(null);
    setOptionForm(emptyOptionForm);

    try {
      const res = await fetch(`/api/admin/option-groups/${group.id}/options`, {
        method: "GET",
        cache: "no-store",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error ?? "No se pudieron cargar las opciones");
      }

      const payload = (await res.json()) as { data: OptionItem[] };
      setOptions(payload.data ?? []);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error inesperado al cargar opciones";
      toast({
        title: "No se pudieron cargar las opciones",
        description: message,
        variant: "destructive",
      });
      setOptions([]);
    } finally {
      setOptionsLoading(false);
    }
  }

  function startCreateOption() {
    setEditingOption(null);
    setOptionForm(emptyOptionForm);
  }

  function startEditOption(option: OptionItem) {
    setEditingOption(option);
    setOptionForm({
      name: option.name,
      priceDelta: formatCentsToMajorUnit(option.priceDeltaCents),
      sortOrder: String(option.sortOrder),
      isActive: option.isActive ? "ACTIVE" : "INACTIVE",
    });
  }

  async function submitOption(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!optionsGroup) return;

    setSavingOption(true);

    try {
      const parsedPriceDeltaCents = parseMajorUnitToCents(optionForm.priceDelta);
      if (parsedPriceDeltaCents === null) {
        throw new Error("El precio adicional debe ser un numero valido con hasta 2 decimales.");
      }

      const payload = {
        name: optionForm.name.trim(),
        priceDeltaCents: parsedPriceDeltaCents,
        sortOrder: optionForm.sortOrder.trim()
          ? Number.parseInt(optionForm.sortOrder, 10)
          : undefined,
        isActive: optionForm.isActive === "ACTIVE",
      };

      const isEdit = Boolean(editingOption);
      const endpoint = isEdit
        ? `/api/admin/option-groups/${optionsGroup.id}/options/${editingOption!.id}`
        : `/api/admin/option-groups/${optionsGroup.id}/options`;

      const res = await fetch(endpoint, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error ?? "No se pudo guardar la opcion");
      }

      const body = (await res.json()) as { data: OptionItem };
      if (isEdit) {
        setOptions((prev) =>
          prev.map((item) => (item.id === body.data.id ? body.data : item)),
        );
      } else {
        setOptions((prev) => [...prev, body.data].sort((a, b) => a.sortOrder - b.sortOrder));
      }

      setEditingOption(null);
      setOptionForm(emptyOptionForm);
      toast({
        title: isEdit ? "opcion actualizada" : "opcion creada",
        description: "Los cambios se guardaron correctamente.",
      });
      await loadGroups();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error inesperado al guardar la opcion";
      toast({
        title: "No se pudo guardar la opcion",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSavingOption(false);
    }
  }

  async function deleteOption(option: OptionItem) {
    if (!optionsGroup) return;

    try {
      const res = await fetch(
        `/api/admin/option-groups/${optionsGroup.id}/options/${option.id}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error ?? "No se pudo eliminar la opcion");
      }

      setOptions((prev) => prev.filter((item) => item.id !== option.id));
      if (editingOption?.id === option.id) {
        setEditingOption(null);
        setOptionForm(emptyOptionForm);
      }
      toast({
        title: "opcion eliminada",
        description: "La opcion fue eliminada.",
      });
      await loadGroups();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error inesperado al eliminar la opcion";
      toast({
        title: "No se pudo eliminar la opcion",
        description: message,
        variant: "destructive",
      });
    }
  }

  function submitSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPage(1);
    setQuery(searchInput.trim());
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <form onSubmit={submitSearch} className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar por nombre"
            className="sm:max-w-sm"
          />
          <Button type="submit" disabled={loading}>
            Buscar
          </Button>
        </form>
        <Button type="button" onClick={openCreateGroup}>
          Nuevo grupo de opciones
        </Button>
      </div>

      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : (
        <p className="text-muted-foreground text-sm">{visibleRange}</p>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Reglas de selección</TableHead>
            <TableHead>Orden</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Opciones</TableHead>
            <TableHead>Usado por productos</TableHead>
            <TableHead>Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                Cargando grupos de opciones...
              </TableCell>
            </TableRow>
          ) : groups.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                No se encontraron grupos de opciones.
              </TableCell>
            </TableRow>
          ) : (
            groups.map((group) => (
              <TableRow key={group.id}>
                <TableCell>{group.name}</TableCell>
                <TableCell>
                  Mín {group.minSelect} / Máx {group.maxSelect}
                </TableCell>
                <TableCell>{group.sortOrder}</TableCell>
                <TableCell>
                  <Badge variant={group.isActive ? "success" : "warning"}>
                    {group.isActive ? "Activo" : "Inactivo"}
                  </Badge>
                </TableCell>
                <TableCell>{group._count.options}</TableCell>
                <TableCell>{group._count.products}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => openEditGroup(group)}>
                      Editar
                    </Button>
                    <Button type="button" variant="outline" onClick={() => loadOptions(group)}>
                      Opciones
                    </Button>
                  </div>
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

      <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingGroup ? "Editar grupo de opciones" : "Nuevo grupo de opciones"}</DialogTitle>
            <DialogDescription>
              Define cuantas opciones puede seleccionar el cliente en este grupo.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={submitGroup} className="space-y-3">
            <div className="space-y-1">
              <label htmlFor="group-name" className="text-sm font-medium">
                Nombre
              </label>
              <Input
                id="group-name"
                value={groupForm.name}
                onChange={(e) => setGroupForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Ejemplo: Salsas"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <label htmlFor="group-min" className="text-sm font-medium">
                  Seleccion minima
                </label>
                <Input
                  id="group-min"
                  type="number"
                  min={0}
                  value={groupForm.minSelect}
                  onChange={(e) =>
                    setGroupForm((prev) => ({ ...prev, minSelect: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="group-max" className="text-sm font-medium">
                  Seleccion maxima
                </label>
                <Input
                  id="group-max"
                  type="number"
                  min={1}
                  value={groupForm.maxSelect}
                  onChange={(e) =>
                    setGroupForm((prev) => ({ ...prev, maxSelect: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="group-order" className="text-sm font-medium">
                  Orden
                </label>
                <Input
                  id="group-order"
                  type="number"
                  min={1}
                  value={groupForm.sortOrder}
                  onChange={(e) =>
                    setGroupForm((prev) => ({ ...prev, sortOrder: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Estado</label>
              <Select
                value={groupForm.isActive}
                onValueChange={(value) =>
                  setGroupForm((prev) => ({
                    ...prev,
                    isActive: value as "ACTIVE" | "INACTIVE",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Activo</SelectItem>
                  <SelectItem value="INACTIVE">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setGroupDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={savingGroup}>
                {savingGroup ? "Guardando..." : "Guardar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={optionsDialogOpen} onOpenChange={setOptionsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Gestionar opciones: {optionsGroup?.name ?? ""}</DialogTitle>
            <DialogDescription>
              Crea y edita opciones para este grupo. Puedes usar punto o coma en decimales.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={submitOption} className="space-y-3 rounded-md border p-3">
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="space-y-1 sm:col-span-2">
                <label htmlFor="option-name" className="text-sm font-medium">
                  Nombre
                </label>
                <Input
                  id="option-name"
                  value={optionForm.name}
                  onChange={(e) =>
                    setOptionForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Ejemplo: Queso extra"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="option-price" className="text-sm font-medium">
                  Precio adicional
                </label>
                <Input
                  id="option-price"
                  type="text"
                  inputMode="decimal"
                  value={optionForm.priceDelta}
                  onChange={(e) =>
                    setOptionForm((prev) => ({
                      ...prev,
                      priceDelta: e.target.value,
                    }))
                  }
                  placeholder="Ejemplo: 1.50"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="option-order" className="text-sm font-medium">
                  Orden
                </label>
                <Input
                  id="option-order"
                  type="number"
                  min={1}
                  value={optionForm.sortOrder}
                  onChange={(e) =>
                    setOptionForm((prev) => ({ ...prev, sortOrder: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1">
                <label className="text-sm font-medium">Estado</label>
                <Select
                  value={optionForm.isActive}
                  onValueChange={(value) =>
                    setOptionForm((prev) => ({
                      ...prev,
                      isActive: value as "ACTIVE" | "INACTIVE",
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Activo</SelectItem>
                    <SelectItem value="INACTIVE">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editingOption ? (
                <Button type="button" variant="outline" onClick={startCreateOption}>
                  Limpiar
                </Button>
              ) : null}
              <Button type="submit" disabled={savingOption}>
                {savingOption ? "Guardando..." : editingOption ? "Actualizar" : "Agregar"}
              </Button>
            </div>
          </form>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Orden</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {optionsLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                    Cargando opciones...
                  </TableCell>
                </TableRow>
              ) : options.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                    Aun no hay opciones en este grupo.
                  </TableCell>
                </TableRow>
              ) : (
                options
                  .slice()
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((option) => (
                    <TableRow key={option.id}>
                      <TableCell>{option.name}</TableCell>
                      <TableCell>{formatMoney(option.priceDeltaCents)}</TableCell>
                      <TableCell>{option.sortOrder}</TableCell>
                      <TableCell>
                        <Badge variant={option.isActive ? "success" : "warning"}>
                          {option.isActive ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button type="button" variant="outline" onClick={() => startEditOption(option)}>
                            Editar
                          </Button>
                          <Button type="button" variant="destructive" onClick={() => void deleteOption(option)}>
                            Eliminar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </section>
  );
}



