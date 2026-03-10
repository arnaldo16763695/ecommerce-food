type UploadResponse = {
  data?: {
    path: string;
    url: string;
  };
  error?: string;
};

export async function uploadImageToStorage(params: {
  file: File;
  folderSuffix?: string;
}) {
  const formData = new FormData();
  formData.append("file", params.file);
  if (params.folderSuffix) {
    formData.append("folderSuffix", params.folderSuffix);
  }

  const res = await fetch("/api/admin/uploads/storage", {
    method: "POST",
    body: formData,
  });

  const body = (await res.json().catch(() => null)) as UploadResponse | null;

  if (!res.ok || !body?.data?.url) {
    throw new Error(body?.error ?? "No se pudo subir la imagen al almacenamiento.");
  }

  return body.data;
}
