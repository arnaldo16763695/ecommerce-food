import { notFound } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import prisma from "@/lib/prisma";
import ProductForm from "../../product-form";

type Props = {
  params: Promise<{ productId: string }>;
};

async function EditProductPage({ params }: Props) {
  const { productId } = await params;

  const [product, categories, optionGroups] = await Promise.all([
    prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        basePriceCents: true,
        prepTimeMin: true,
        categoryId: true,
        coverImageUrl: true,
        isActive: true,
        isFeatured: true,
        optionGroups: {
          orderBy: { sortOrder: "asc" },
          select: {
            groupId: true,
            sortOrder: true,
          },
        },
      },
    }),
    prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        name: true,
      },
    }),
    prisma.optionGroup.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        minSelect: true,
        maxSelect: true,
      },
    }),
  ]);

  if (!product) {
    notFound();
  }

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/admin/dashboard">Admin</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="/admin/products">Productos</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Editar producto</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="rounded-lg border p-4">
          <ProductForm
            categories={categories}
            optionGroups={optionGroups}
            initialData={product}
          />
        </div>
      </div>
    </>
  );
}

export default EditProductPage;
