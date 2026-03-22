"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { formatCentsToMajorUnit, parseMajorUnitToCents } from "@/lib/money";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { uploadImageToStorage } from "@/lib/uploads/client-upload";

type CategoryItem = {
  id: string;
  name: string;
};

type OptionGroupItem = {
  id: string;
  name: string;
  minSelect: number;
  maxSelect: number;
};

type ProductFormInitialData = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  basePriceCents: number;
  prepTimeMin: number | null;
  categoryId: string | null;
  coverImageUrl: string | null;
  isActive: boolean;
  isFeatured: boolean;
  trackStock: boolean;
  stockQuantity: number;
  variants: Array<{
    id: string;
    name: string;
    priceDeltaCents: number;
    isActive: boolean;
    trackStock: boolean;
    stockQuantity: number;
    sortOrder: number;
  }>;
  optionGroups: Array<{
    groupId: string;
    sortOrder: number;
  }>;
};

type Props = {
  categories: CategoryItem[];
  optionGroups: OptionGroupItem[];
  initialData?: ProductFormInitialData;
};

type SelectedGroupState = {
  groupId: string;
  sortOrder: string;
};

type ProductVariantState = {
  id?: string;
  name: string;
  priceDeltaInput: string;
  isActive: boolean;
  trackStock: boolean;
  stockQuantity: string;
  sortOrder: string;
};

export default function ProductForm({
  categories,
  optionGroups,
  initialData,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const isEditMode = Boolean(initialData);

  const [name, setName] = useState(initialData?.name ?? "");
  const [slug, setSlug] = useState(initialData?.slug ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [basePriceInput, setBasePriceInput] = useState(
    initialData ? formatCentsToMajorUnit(initialData.basePriceCents) : "",
  );
  const [prepTimeMin, setPrepTimeMin] = useState(
    initialData?.prepTimeMin ? String(initialData.prepTimeMin) : "",
  );
  const [categoryId, setCategoryId] = useState(initialData?.categoryId ?? "NONE");
  const [coverImageUrl, setCoverImageUrl] = useState(initialData?.coverImageUrl ?? "");
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [isFeatured, setIsFeatured] = useState(initialData?.isFeatured ?? false);
  const [trackStock, setTrackStock] = useState(initialData?.trackStock ?? false);
  const [stockQuantity, setStockQuantity] = useState(
    initialData ? String(initialData.stockQuantity) : "0",
  );
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [variants, setVariants] = useState<ProductVariantState[]>(
    (initialData?.variants ?? []).map((variant) => ({
      id: variant.id,
      name: variant.name,
      priceDeltaInput: formatCentsToMajorUnit(variant.priceDeltaCents),
      isActive: variant.isActive,
      trackStock: variant.trackStock,
      stockQuantity: String(variant.stockQuantity),
      sortOrder: String(variant.sortOrder),
    })),
  );
  const [selectedGroups, setSelectedGroups] = useState<SelectedGroupState[]>(
    (initialData?.optionGroups ?? []).map((item) => ({
      groupId: item.groupId,
      sortOrder: String(item.sortOrder),
    })),
  );

  const selectedGroupMap = useMemo(() => {
    const map = new Map<string, SelectedGroupState>();
    for (const item of selectedGroups) {
      map.set(item.groupId, item);
    }
    return map;
  }, [selectedGroups]);

  function toggleGroup(groupId: string, checked: boolean) {
    setSelectedGroups((prev) => {
      const exists = prev.some((item) => item.groupId === groupId);
      if (checked && !exists) {
        return [...prev, { groupId, sortOrder: String(prev.length + 1) }];
      }
      if (!checked && exists) {
        return prev.filter((item) => item.groupId !== groupId);
      }
      return prev;
    });
  }

  function updateGroupSortOrder(groupId: string, value: string) {
    setSelectedGroups((prev) =>
      prev.map((item) =>
        item.groupId === groupId ? { ...item, sortOrder: value } : item,
      ),
    );
  }

  function addVariant() {
    setVariants((prev) => [
      ...prev,
      {
        name: "",
        priceDeltaInput: "0",
        isActive: true,
        trackStock: false,
        stockQuantity: "0",
        sortOrder: String(prev.length + 1),
      },
    ]);
  }

  function updateVariant(index: number, patch: Partial<ProductVariantState>) {
    setVariants((prev) =>
      prev.map((variant, currentIndex) =>
        currentIndex === index ? { ...variant, ...patch } : variant,
      ),
    );
  }

  function removeVariant(index: number) {
    setVariants((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
  }

  async function uploadCoverImage(file: File) {
    setUploadingImage(true);

    try {
      const uploaded = await uploadImageToStorage({
        file,
        folderSuffix: "products",
      });
      setCoverImageUrl(uploaded.url);
      toast({
        title: "Imagen subida",
        description: "La imagen principal se subio correctamente.",
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al subir la imagen";
      toast({
        title: "No se pudo subir la imagen",
        description: message,
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);

    try {
      const parsedBasePriceCents = parseMajorUnitToCents(basePriceInput);
      if (parsedBasePriceCents === null) {
        throw new Error("El precio base debe ser un numero valido con hasta 2 decimales.");
      }
      const parsedStockQuantity = Number.parseInt(stockQuantity.trim() || "0", 10);
      if (!Number.isFinite(parsedStockQuantity) || parsedStockQuantity < 0) {
        throw new Error("El stock debe ser un numero entero igual o mayor a cero.");
      }

      const normalizedVariants = variants
        .map((variant, index) => {
          const parsedVariantPriceDelta = parseMajorUnitToCents(
            variant.priceDeltaInput,
          );
          if (parsedVariantPriceDelta === null) {
            throw new Error(
              `El ajuste de precio de la variante ${index + 1} no es valido.`,
            );
          }

          const parsedVariantStock = Number.parseInt(
            variant.stockQuantity.trim() || "0",
            10,
          );
          if (!Number.isFinite(parsedVariantStock) || parsedVariantStock < 0) {
            throw new Error(
              `El stock de la variante ${index + 1} debe ser un numero entero igual o mayor a cero.`,
            );
          }

          const normalizedName = variant.name.trim();
          if (!normalizedName) {
            throw new Error(`La variante ${index + 1} debe tener un nombre.`);
          }

          return {
            id: variant.id,
            name: normalizedName,
            priceDeltaCents: parsedVariantPriceDelta,
            isActive: variant.isActive,
            trackStock: variant.trackStock,
            stockQuantity: variant.trackStock ? parsedVariantStock : 0,
            sortOrder: variant.sortOrder.trim()
              ? Number.parseInt(variant.sortOrder, 10)
              : index + 1,
          };
        })
        .filter((variant) => variant.name.length > 0);

      const payload = {
        name: name.trim(),
        slug: slug.trim() || undefined,
        description: description.trim() || undefined,
        basePriceCents: parsedBasePriceCents,
        prepTimeMin: prepTimeMin.trim()
          ? Number.parseInt(prepTimeMin, 10)
          : null,
        categoryId: categoryId === "NONE" ? null : categoryId,
        coverImageUrl: coverImageUrl.trim() || null,
        isActive,
        isFeatured,
        trackStock,
        stockQuantity: trackStock ? parsedStockQuantity : 0,
        variants: normalizedVariants,
        images: coverImageUrl.trim()
          ? [{ url: coverImageUrl.trim(), alt: name.trim() || undefined }]
          : [],
        optionGroups: selectedGroups.map((item, idx) => ({
          groupId: item.groupId,
          sortOrder: item.sortOrder.trim()
            ? Number.parseInt(item.sortOrder, 10)
            : idx + 1,
        })),
      };

      const endpoint = isEditMode
        ? `/api/admin/products/${initialData!.id}`
        : "/api/admin/products";
      const method = isEditMode ? "PATCH" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(
          body?.error ??
            (isEditMode
              ? "No se pudo actualizar el producto"
              : "No se pudo crear el producto"),
        );
      }

      toast({
        title: isEditMode ? "Producto actualizado" : "Producto creado",
        description: isEditMode
          ? "El producto se actualizo correctamente."
          : "El producto se guardo correctamente.",
      });
      router.push("/admin/products");
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : isEditMode
            ? "Error al actualizar el producto"
            : "Error al crear el producto";
      toast({
        title: isEditMode
          ? "No se pudo actualizar el producto"
          : "No se pudo crear el producto",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="product-name" className="text-sm font-medium">
            Nombre
          </label>
          <Input
            id="product-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ejemplo: Hamburguesa clasica"
            required
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="product-slug" className="text-sm font-medium">
            Slug (opcional)
          </label>
          <Input
            id="product-slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="Se genera automaticamente si esta vacio"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="product-description" className="text-sm font-medium">
          Descripcion
        </label>
        <textarea
          id="product-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe el producto"
          className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring min-h-24 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-1.5">
          <label htmlFor="product-price" className="text-sm font-medium">
            Precio base (USD)
          </label>
          <Input
            id="product-price"
            type="text"
            inputMode="decimal"
            value={basePriceInput}
            onChange={(e) => setBasePriceInput(e.target.value)}
            placeholder="Ejemplo: 10.30"
            required
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="product-prep-time" className="text-sm font-medium">
            Tiempo de preparacion (min)
          </label>
          <Input
            id="product-prep-time"
            type="number"
            min={1}
            value={prepTimeMin}
            onChange={(e) => setPrepTimeMin(e.target.value)}
            placeholder="Opcional"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Categoria</label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona una categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NONE">Sin categoria</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Imagen principal</label>
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <Input
            value={coverImageUrl}
            onChange={(e) => setCoverImageUrl(e.target.value)}
            placeholder="URL de portada"
          />
          <Input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                void uploadCoverImage(file);
              }
              e.currentTarget.value = "";
            }}
            disabled={uploadingImage}
            className="md:max-w-xs"
          />
        </div>
        {uploadingImage ? (
          <p className="text-muted-foreground text-xs">Subiendo imagen...</p>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          Producto activo
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isFeatured}
            onChange={(e) => setIsFeatured(e.target.checked)}
          />
          Destacar en tienda
        </label>
      </div>

      <div className="rounded-md border p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm">
          <input
            id="track-stock"
            type="checkbox"
            checked={trackStock}
            onChange={(e) => setTrackStock(e.target.checked)}
          />
          <label htmlFor="track-stock" className="font-medium">
            Controlar stock de este producto
          </label>
        </div>

        <div className="space-y-1.5 md:max-w-xs">
          <label htmlFor="stock-quantity" className="text-sm font-medium">
            Stock disponible
          </label>
          <Input
            id="stock-quantity"
            type="number"
            min={0}
            value={stockQuantity}
            onChange={(e) => setStockQuantity(e.target.value)}
            disabled={!trackStock}
          />
          <p className="text-xs text-slate-500">
            Si el stock llega a 0, el producto se mostrara como agotado y no se podra vender.
          </p>
        </div>
      </div>

      <div className="space-y-3 rounded-md border p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Variantes del producto</p>
            <p className="text-xs text-slate-500">
              Utiliza variantes para sabores o presentaciones, por ejemplo: naranja, uva o cola.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={addVariant}>
            Agregar variante
          </Button>
        </div>

        {variants.length === 0 ? (
          <p className="text-sm text-slate-500">
            Este producto no tiene variantes. Se vendera como un producto simple.
          </p>
        ) : (
          <div className="space-y-3">
            {variants.map((variant, index) => (
              <div key={variant.id ?? `new-${index}`} className="space-y-3 rounded-md border p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">Variante #{index + 1}</p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => removeVariant(index)}
                  >
                    Quitar
                  </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Nombre</label>
                    <Input
                      value={variant.name}
                      onChange={(e) => updateVariant(index, { name: e.target.value })}
                      placeholder="Ejemplo: Naranja"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Ajuste de precio (USD)</label>
                    <Input
                      value={variant.priceDeltaInput}
                      onChange={(e) =>
                        updateVariant(index, { priceDeltaInput: e.target.value })
                      }
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Orden</label>
                    <Input
                      type="number"
                      min={1}
                      value={variant.sortOrder}
                      onChange={(e) => updateVariant(index, { sortOrder: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={variant.isActive}
                      onChange={(e) =>
                        updateVariant(index, { isActive: e.target.checked })
                      }
                    />
                    Variante activa
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={variant.trackStock}
                      onChange={(e) =>
                        updateVariant(index, { trackStock: e.target.checked })
                      }
                    />
                    Controlar stock por variante
                  </label>
                </div>

                <div className="space-y-1.5 md:max-w-xs">
                  <label className="text-sm font-medium">Stock de la variante</label>
                  <Input
                    type="number"
                    min={0}
                    value={variant.stockQuantity}
                    onChange={(e) =>
                      updateVariant(index, { stockQuantity: e.target.value })
                    }
                    disabled={!variant.trackStock}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3 rounded-md border p-4">
        <p className="text-sm font-medium">Grupos de opciones</p>
        {optionGroups.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No hay grupos de opciones para asociar.
          </p>
        ) : (
          <div className="space-y-2">
            {optionGroups.map((group) => {
              const selected = selectedGroupMap.get(group.id);
              return (
                <div
                  key={group.id}
                  className="flex flex-col gap-2 rounded-md border p-3 md:flex-row md:items-center md:justify-between"
                >
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={Boolean(selected)}
                      onChange={(e) => toggleGroup(group.id, e.target.checked)}
                    />
                    <span>
                      {group.name} (min {group.minSelect} / max {group.maxSelect})
                    </span>
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs">Orden</span>
                    <Input
                      type="number"
                      min={1}
                      value={selected?.sortOrder ?? ""}
                      onChange={(e) => updateGroupSortOrder(group.id, e.target.value)}
                      disabled={!selected}
                      className="w-24"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" onClick={() => router.push("/admin/products")}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          {saving
            ? "Guardando..."
            : isEditMode
              ? "Actualizar producto"
              : "Crear producto"}
        </Button>
      </div>
    </form>
  );
}
