"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
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
import { resolveProductImageSrc } from "@/lib/product-image";

type AdminProduct = {
  id: string;
  name: string;
  slug: string;
  basePriceCents: number;
  coverImageUrl: string | null;
  isActive: boolean;
  isFeatured: boolean;
  createdAt: string;
  images: { url: string }[];
  category: {
    id: string;
    name: string;
  } | null;
};

type ProductsResponse = {
  data: AdminProduct[];
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

const LIMIT = 10;

function formatMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function ProductsTable() {
  const { toast } = useToast();
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingProductId, setSavingProductId] = useState<string | null>(null);
  const [uploadingProductId, setUploadingProductId] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(LIMIT),
      });
      if (query) params.set("q", query);

      const res = await fetch(`/api/admin/products?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error ?? "No se pudo cargar la lista de productos");
      }

      const payload = (await res.json()) as ProductsResponse;
      setProducts(payload.data ?? []);
      setTotal(payload.meta?.total ?? 0);
      setTotalPages(Math.max(1, payload.meta?.totalPages ?? 1));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error inesperado al cargar productos";
      setError(message);
      toast({
        title: "Error al cargar productos",
        description: message,
        variant: "destructive",
      });
      setProducts([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, query, toast]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const visibleRangeLabel = useMemo(() => {
    if (total === 0 || products.length === 0) return "0 resultados";
    const from = (page - 1) * LIMIT + 1;
    const to = from + products.length - 1;
    return `${from}-${to} de ${total} productos`;
  }, [page, total, products.length]);

  async function patchProduct(
    productId: string,
    payload: {
      isActive?: boolean;
      isFeatured?: boolean;
      imageUrl?: string;
      coverImageUrl?: string;
    },
    successMessage = "Producto actualizado",
  ) {
    setSavingProductId(productId);
    setError(null);

    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error ?? "No se pudo actualizar el producto");
      }

      const body = (await res.json()) as { data: AdminProduct };
      setProducts((prev) =>
        prev.map((product) =>
          product.id === productId ? { ...product, ...body.data } : product,
        ),
      );

      toast({
        title: successMessage,
        description: "Se guardaron los cambios del producto.",
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al actualizar el producto";
      setError(message);
      toast({
        title: "No se pudo actualizar el producto",
        description: message,
        variant: "destructive",
      });
      await loadProducts();
    } finally {
      setSavingProductId(null);
    }
  }

  async function handleUploadImage(productId: string, file: File) {
    setUploadingProductId(productId);
    setError(null);

    try {
      const signRes = await fetch("/api/admin/uploads/cloudinary-signature", {
        method: "POST",
      });

      if (!signRes.ok) {
        const body = (await signRes.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error ?? "No se pudo firmar la subida");
      }

      const signPayload = (await signRes.json()) as CloudinarySignatureResponse;
      const signatureData = signPayload.data;

      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", signatureData.apiKey);
      formData.append("timestamp", signatureData.timestamp);
      formData.append("folder", signatureData.folder);
      formData.append("signature", signatureData.signature);

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${signatureData.cloudName}/image/upload`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (!uploadRes.ok) {
        const uploadText = await uploadRes.text();
        throw new Error(`Cloudinary upload failed: ${uploadText}`);
      }

      const uploadBody = (await uploadRes.json()) as { secure_url?: string };
      const secureUrl = uploadBody.secure_url;

      if (!secureUrl) {
        throw new Error("Cloudinary did not return secure_url");
      }

      await patchProduct(
        productId,
        { imageUrl: secureUrl, coverImageUrl: secureUrl },
        "Imagen actualizada",
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al subir imagen del producto";
      setError(message);
      toast({
        title: "No se pudo subir la imagen",
        description: message,
        variant: "destructive",
      });
    } finally {
      setUploadingProductId(null);
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
          placeholder="Buscar por producto, slug o categoria"
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
            <TableHead>Imagen</TableHead>
            <TableHead>Producto</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Precio</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Destacado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={6} className="text-muted-foreground py-8 text-center">
                Cargando productos...
              </TableCell>
            </TableRow>
          ) : products.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-muted-foreground py-8 text-center">
                No hay productos para mostrar
              </TableCell>
            </TableRow>
          ) : (
            products.map((product) => (
              <TableRow key={product.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="bg-muted relative h-12 w-12 overflow-hidden rounded-md">
                      <Image
                        src={resolveProductImageSrc(
                          product.images[0]?.url ?? product.coverImageUrl,
                        )}
                        alt={product.name}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    </div>
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingProductId === product.id}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) {
                            void handleUploadImage(product.id, file);
                          }
                          event.currentTarget.value = "";
                        }}
                      />
                      <span className="text-xs font-medium text-amber-700 hover:underline">
                        {uploadingProductId === product.id ? "Subiendo..." : "Subir"}
                      </span>
                    </label>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <p className="font-medium">{product.name}</p>
                    <p className="text-muted-foreground text-xs">{product.slug}</p>
                  </div>
                </TableCell>
                <TableCell>{product.category?.name ?? "-"}</TableCell>
                <TableCell>{formatMoney(product.basePriceCents)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Badge variant={product.isActive ? "success" : "warning"}>
                      {product.isActive ? "Activo" : "Inactivo"}
                    </Badge>
                    <Select
                      value={product.isActive ? "ACTIVE" : "INACTIVE"}
                      disabled={savingProductId === product.id}
                      onValueChange={(value) =>
                        patchProduct(product.id, { isActive: value === "ACTIVE" })
                      }
                    >
                      <SelectTrigger className="w-[130px]">
                        <SelectValue placeholder="Estado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">Activo</SelectItem>
                        <SelectItem value="INACTIVE">Inactivo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Badge variant={product.isFeatured ? "secondary" : "outline"}>
                      {product.isFeatured ? "Si" : "No"}
                    </Badge>
                    <Select
                      value={product.isFeatured ? "YES" : "NO"}
                      disabled={savingProductId === product.id}
                      onValueChange={(value) =>
                        patchProduct(product.id, { isFeatured: value === "YES" })
                      }
                    >
                      <SelectTrigger className="w-[110px]">
                        <SelectValue placeholder="Destacado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="YES">Si</SelectItem>
                        <SelectItem value="NO">No</SelectItem>
                      </SelectContent>
                    </Select>
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
    </section>
  );
}
