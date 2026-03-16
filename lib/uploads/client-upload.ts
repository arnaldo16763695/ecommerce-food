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
  endpoint?: string;
}) {
  const formData = new FormData();
  formData.append("file", params.file);
  if (params.folderSuffix) {
    formData.append("folderSuffix", params.folderSuffix);
  }

  const res = await fetch(params.endpoint ?? "/api/admin/uploads/storage", {
    method: "POST",
    body: formData,
  });

  const body = (await res.json().catch(() => null)) as UploadResponse | null;

  if (!res.ok || !body?.data?.url) {
    throw new Error(body?.error ?? "No se pudo subir la imagen al almacenamiento.");
  }

  return body.data;
}

export async function uploadCheckoutProofToStorage(params: { file: File }) {
  return uploadImageToStorage({
    file: params.file,
    folderSuffix: "checkout-proofs",
    endpoint: "/api/uploads/payment-proof",
  });
}
