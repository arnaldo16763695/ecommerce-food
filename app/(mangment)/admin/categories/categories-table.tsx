"use client";

import Image from "next/image";
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
import { slugify } from "@/lib/slug";

type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
  imgUrl: string;
  createdAt: string;
  _count: {
    products: number;
  };
};

type CategoriesResponse = {
  data: AdminCategory[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type CloudinarySignatureResponse = {
  data: {
    cloudName: string;
    apiKey: string;
    timestamp: string;
    folder: string;
    signature: string;
  };
};

type CategoryFormState = {
  name: string;
  slug: string;
  sortOrder: string;
  isActive: "ACTIVE" | "INACTIVE";
  imgUrl: string;
};

const LIMIT = 10;

const emptyForm: CategoryFormState = {
  name: "",
  slug: "",
  sortOrder: "",
  isActive: "ACTIVE",
  imgUrl: "/images/category-img.png",
};

function normalizeCategoryImage(url: string) {
  if (!url) return "/images/category-img.png";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return url;
  return `/images/${url}`;
}

export default function CategoriesTable() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AdminCategory | null>(null);
  const [form, setForm] = useState<CategoryFormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(LIMIT),
      });
      if (query) params.set("q", query);

      const res = await fetch(`/api/admin/categories?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error ?? "No se pudo cargar categorias");
      }

      const payload = (await res.json()) as CategoriesResponse;
      setCategories(payload.data ?? []);
      setTotal(payload.meta?.total ?? 0);
      setTotalPages(Math.max(1, payload.meta?.totalPages ?? 1));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error inesperado al cargar categorias";
      setError(message);
      toast({
        title: "Error al cargar categorias",
        description: message,
        variant: "destructive",
      });
      setCategories([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, query, toast]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const visibleRangeLabel = useMemo(() => {
    if (total === 0 || categories.length === 0) return "0 resultados";
    const from = (page - 1) * LIMIT + 1;
    const to = from + categories.length - 1;
    return `${from}-${to} de ${total} categorias`;
  }, [page, total, categories.length]);

  function openCreateDialog() {
    setEditingCategory(null);
    setForm(emptyForm);
    setIsDialogOpen(true);
  }

  function openEditDialog(category: AdminCategory) {
    setEditingCategory(category);
    setForm({
      name: category.name,
      slug: category.slug,
      sortOrder: String(category.sortOrder),
      isActive: category.isActive ? "ACTIVE" : "INACTIVE",
      imgUrl: category.imgUrl,
    });
    setIsDialogOpen(true);
  }

  async function uploadCategoryImage(file: File) {
    setUploadingImage(true);

    try {
      const signRes = await fetch("/api/admin/uploads/cloudinary-signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderSuffix: "categories" }),
      });

      if (!signRes.ok) {
        const body = (await signRes.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error ?? "No se pudo firmar la subida");
      }

      const signaturePayload = (await signRes.json()) as CloudinarySignatureResponse;
      const signature = signaturePayload.data;

      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", signature.apiKey);
      formData.append("timestamp", signature.timestamp);
      formData.append("folder", signature.folder);
      formData.append("signature", signature.signature);

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (!uploadRes.ok) {
        const text = await uploadRes.text();
        throw new Error(`Cloudinary upload failed: ${text}`);
      }

      const uploadBody = (await uploadRes.json()) as { secure_url?: string };
      if (!uploadBody.secure_url) {
        throw new Error("Cloudinary did not return secure_url");
      }

      setForm((prev) => ({ ...prev, imgUrl: uploadBody.secure_url! }));
      toast({
        title: "Imagen subida",
        description: "La imagen de categoria fue subida correctamente.",
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al subir imagen de categoria";
      toast({
        title: "No se pudo subir la imagen",
        description: message,
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleSubmitCategory(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      // Keep a single normalization path so create/edit stay consistent.
      const payload = {
        name: form.name.trim(),
        slug: slugify(form.slug || form.name),
        sortOrder: form.sortOrder.trim()
          ? Number.parseInt(form.sortOrder, 10)
          : undefined,
        isActive: form.isActive === "ACTIVE",
        imgUrl: form.imgUrl.trim(),
      };

      const isEdit = Boolean(editingCategory);
      const endpoint = isEdit
        ? `/api/admin/categories/${editingCategory!.id}`
        : "/api/admin/categories";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error ?? "No se pudo guardar la categoria");
      }

      toast({
        title: isEdit ? "Categoria actualizada" : "Categoria creada",
        description: "Los cambios fueron guardados.",
      });

      setIsDialogOpen(false);
      setEditingCategory(null);
      setForm(emptyForm);
      await loadCategories();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al guardar categoria";
      setError(message);
      toast({
        title: "No se pudo guardar la categoria",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  function handleSearchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPage(1);
    setQuery(searchInput.trim());
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <form onSubmit={handleSearchSubmit} className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar por nombre o slug"
            className="sm:max-w-sm"
          />
          <Button type="submit" disabled={loading}>
            Buscar
          </Button>
        </form>
        <Button type="button" onClick={openCreateDialog}>
          Nueva categoria
        </Button>
      </div>

      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : (
        <p className="text-muted-foreground text-sm">{visibleRangeLabel}</p>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Imagen</TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead>Orden</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Productos</TableHead>
            <TableHead>Accion</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={7} className="text-muted-foreground py-8 text-center">
                Cargando categorias...
              </TableCell>
            </TableRow>
          ) : categories.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-muted-foreground py-8 text-center">
                No hay categorias para mostrar
              </TableCell>
            </TableRow>
          ) : (
            categories.map((category) => (
              <TableRow key={category.id}>
                <TableCell>
                  <div className="bg-muted relative h-12 w-12 overflow-hidden rounded-md">
                    <Image
                      src={normalizeCategoryImage(category.imgUrl)}
                      alt={category.name}
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  </div>
                </TableCell>
                <TableCell>{category.name}</TableCell>
                <TableCell>{category.slug}</TableCell>
                <TableCell>{category.sortOrder}</TableCell>
                <TableCell>
                  <Badge variant={category.isActive ? "success" : "warning"}>
                    {category.isActive ? "Activo" : "Inactivo"}
                  </Badge>
                </TableCell>
                <TableCell>{category._count.products}</TableCell>
                <TableCell>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => openEditDialog(category)}
                  >
                    Editar
                  </Button>
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Editar categoria" : "Nueva categoria"}
            </DialogTitle>
            <DialogDescription>
              Completa los campos y guarda cambios.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitCategory} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="category-name" className="text-sm font-medium">
                  Nombre
                </label>
                <Input
                  id="category-name"
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      name: e.target.value,
                      slug: slugify(e.target.value),
                    }))
                  }
                  placeholder="Nombre"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="category-slug" className="text-sm font-medium">
                  Slug
                </label>
                <Input
                  id="category-slug"
                  value={form.slug}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      slug: slugify(e.target.value),
                    }))
                  }
                  placeholder="Slug"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="category-sort-order" className="text-sm font-medium">
                  Orden
                </label>
                <Input
                  id="category-sort-order"
                  value={form.sortOrder}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, sortOrder: e.target.value }))
                  }
                  placeholder="Orden (min 1)"
                  type="number"
                  min={1}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Estado</label>
                <Select
                  value={form.isActive}
                  onValueChange={(value) =>
                    setForm((prev) => ({
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
            </div>

            <div className="space-y-1">
              <label htmlFor="category-image-url" className="text-sm font-medium">
                Image URL
              </label>
              <Input
                id="category-image-url"
                value={form.imgUrl}
                onChange={(e) => setForm((prev) => ({ ...prev, imgUrl: e.target.value }))}
                placeholder="Image URL"
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-muted relative h-16 w-16 overflow-hidden rounded-md">
                <Image
                  src={normalizeCategoryImage(form.imgUrl)}
                  alt="Category preview"
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              </div>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploadingImage}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadCategoryImage(file);
                    event.currentTarget.value = "";
                  }}
                />
                <span className="text-sm font-medium text-amber-700 hover:underline">
                  {uploadingImage ? "Subiendo..." : "Subir imagen"}
                </span>
              </label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting || uploadingImage}>
                {submitting ? "Guardando..." : "Guardar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
