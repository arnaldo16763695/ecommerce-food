"use client";

import { useState } from "react";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { uploadImageToStorage } from "@/lib/uploads/client-upload";

type AccountData = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: "ADMIN" | "PREPARER" | "CUSTOMER";
};

export default function AccountForm({ initialData }: { initialData: AccountData }) {
  const { toast } = useToast();
  const [name, setName] = useState(initialData.name ?? "");
  const [image, setImage] = useState(initialData.image ?? "");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  async function uploadAvatar(file: File) {
    setUploadingAvatar(true);

    try {
      const uploaded = await uploadImageToStorage({
        file,
        folderSuffix: "avatars",
      });
      setImage(uploaded.url);
      toast({
        title: "Avatar subido",
        description: "La imagen se subio correctamente.",
      });
    } catch (err) {
      toast({
        title: "No se pudo subir avatar",
        description: err instanceof Error ? err.message : "Error inesperado.",
        variant: "destructive",
      });
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        name: name.trim(),
        image: image.trim() || null,
      };

      const res = await fetch("/api/admin/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "No se pudo actualizar la cuenta.");
      }

      toast({
        title: "Cuenta actualizada",
        description: "Tus datos se guardaron correctamente.",
      });
    } catch (err) {
      toast({
        title: "No se pudo actualizar",
        description: err instanceof Error ? err.message : "Error inesperado.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border p-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Nombre</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tu nombre"
          required
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Email</label>
        <Input value={initialData.email ?? ""} readOnly disabled />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Avatar</label>
        <div className="space-y-2">
          <div className="flex items-center gap-3 rounded-md border p-3">
            <Image
              src={image || "/images/category-img.png"}
              alt={name || "Avatar"}
              width={56}
              height={56}
              className="h-14 w-14 rounded-full object-cover"
            />
            <p className="text-muted-foreground text-xs">
              Sube una imagen para actualizar tu avatar.
            </p>
          </div>
          <Input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                void uploadAvatar(file);
              }
              e.currentTarget.value = "";
            }}
            disabled={uploadingAvatar}
          />
          {uploadingAvatar ? (
            <p className="text-muted-foreground text-xs">Subiendo avatar...</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Rol</label>
        <Input value={initialData.role} readOnly disabled />
      </div>

      <Button type="submit" disabled={saving}>
        {saving ? "Guardando..." : "Guardar cambios"}
      </Button>
    </form>
  );
}
