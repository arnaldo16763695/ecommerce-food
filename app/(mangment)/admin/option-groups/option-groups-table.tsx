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
  priceDeltaCents: string;
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
  priceDeltaCents: "0",
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
        throw new Error(body?.error ?? "Could not load option groups");
      }

      const payload = (await res.json()) as ListResponse<OptionGroup>;
      setGroups(payload.data ?? []);
      setTotal(payload.meta?.total ?? 0);
      setTotalPages(Math.max(1, payload.meta?.totalPages ?? 1));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unexpected error loading groups";
      setError(message);
      toast({
        title: "Error loading option groups",
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
    if (total === 0 || groups.length === 0) return "0 results";
    const from = (page - 1) * LIMIT + 1;
    const to = from + groups.length - 1;
    return `${from}-${to} of ${total} groups`;
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
        throw new Error(body?.error ?? "Could not save option group");
      }

      setGroupDialogOpen(false);
      setEditingGroup(null);
      setGroupForm(emptyGroupForm);
      toast({
        title: isEdit ? "Option group updated" : "Option group created",
        description: "Changes were saved successfully.",
      });
      await loadGroups();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unexpected error saving group";
      setError(message);
      toast({
        title: "Could not save option group",
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
        throw new Error(body?.error ?? "Could not load options");
      }

      const payload = (await res.json()) as { data: OptionItem[] };
      setOptions(payload.data ?? []);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unexpected error loading options";
      toast({
        title: "Could not load options",
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
      priceDeltaCents: String(option.priceDeltaCents),
      sortOrder: String(option.sortOrder),
      isActive: option.isActive ? "ACTIVE" : "INACTIVE",
    });
  }

  async function submitOption(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!optionsGroup) return;

    setSavingOption(true);

    try {
      const payload = {
        name: optionForm.name.trim(),
        priceDeltaCents: Number.parseInt(optionForm.priceDeltaCents, 10),
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
        throw new Error(body?.error ?? "Could not save option");
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
        title: isEdit ? "Option updated" : "Option created",
        description: "Changes were saved successfully.",
      });
      await loadGroups();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unexpected error saving option";
      toast({
        title: "Could not save option",
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
        throw new Error(body?.error ?? "Could not delete option");
      }

      setOptions((prev) => prev.filter((item) => item.id !== option.id));
      if (editingOption?.id === option.id) {
        setEditingOption(null);
        setOptionForm(emptyOptionForm);
      }
      toast({
        title: "Option deleted",
        description: "The option was removed.",
      });
      await loadGroups();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unexpected error deleting option";
      toast({
        title: "Could not delete option",
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
            placeholder="Search by name"
            className="sm:max-w-sm"
          />
          <Button type="submit" disabled={loading}>
            Search
          </Button>
        </form>
        <Button type="button" onClick={openCreateGroup}>
          New Option Group
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
            <TableHead>Name</TableHead>
            <TableHead>Selection Rules</TableHead>
            <TableHead>Order</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Options</TableHead>
            <TableHead>Used By Products</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                Loading option groups...
              </TableCell>
            </TableRow>
          ) : groups.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                No option groups found.
              </TableCell>
            </TableRow>
          ) : (
            groups.map((group) => (
              <TableRow key={group.id}>
                <TableCell>{group.name}</TableCell>
                <TableCell>
                  Min {group.minSelect} / Max {group.maxSelect}
                </TableCell>
                <TableCell>{group.sortOrder}</TableCell>
                <TableCell>
                  <Badge variant={group.isActive ? "success" : "warning"}>
                    {group.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>{group._count.options}</TableCell>
                <TableCell>{group._count.products}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => openEditGroup(group)}>
                      Edit
                    </Button>
                    <Button type="button" variant="outline" onClick={() => loadOptions(group)}>
                      Options
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
          Previous
        </Button>
        <p className="text-sm">
          Page {page} of {totalPages}
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={loading || page >= totalPages}
        >
          Next
        </Button>
      </div>

      <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingGroup ? "Edit option group" : "New option group"}</DialogTitle>
            <DialogDescription>
              Define how many options customers can select for this group.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={submitGroup} className="space-y-3">
            <div className="space-y-1">
              <label htmlFor="group-name" className="text-sm font-medium">
                Name
              </label>
              <Input
                id="group-name"
                value={groupForm.name}
                onChange={(e) => setGroupForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Example: Sauces"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <label htmlFor="group-min" className="text-sm font-medium">
                  Min Select
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
                  Max Select
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
                  Sort Order
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
              <label className="text-sm font-medium">Status</label>
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
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setGroupDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={savingGroup}>
                {savingGroup ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={optionsDialogOpen} onOpenChange={setOptionsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Manage Options: {optionsGroup?.name ?? ""}</DialogTitle>
            <DialogDescription>
              Create and edit options for this group. Prices are in cents.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={submitOption} className="space-y-3 rounded-md border p-3">
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="space-y-1 sm:col-span-2">
                <label htmlFor="option-name" className="text-sm font-medium">
                  Name
                </label>
                <Input
                  id="option-name"
                  value={optionForm.name}
                  onChange={(e) =>
                    setOptionForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Example: Extra cheese"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="option-price" className="text-sm font-medium">
                  Price Delta
                </label>
                <Input
                  id="option-price"
                  type="number"
                  min={0}
                  value={optionForm.priceDeltaCents}
                  onChange={(e) =>
                    setOptionForm((prev) => ({
                      ...prev,
                      priceDeltaCents: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="option-order" className="text-sm font-medium">
                  Sort Order
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
                <label className="text-sm font-medium">Status</label>
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
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editingOption ? (
                <Button type="button" variant="outline" onClick={startCreateOption}>
                  Clear
                </Button>
              ) : null}
              <Button type="submit" disabled={savingOption}>
                {savingOption ? "Saving..." : editingOption ? "Update" : "Add"}
              </Button>
            </div>
          </form>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {optionsLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                    Loading options...
                  </TableCell>
                </TableRow>
              ) : options.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                    No options in this group yet.
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
                          {option.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button type="button" variant="outline" onClick={() => startEditOption(option)}>
                            Edit
                          </Button>
                          <Button type="button" variant="destructive" onClick={() => void deleteOption(option)}>
                            Delete
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
