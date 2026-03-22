import {
  getProductById,
  getAllProductsByCategory,
} from "@/lib/data/productsData";
import ProductDetails from "@/components/ProductDetails";

async function ProductDetailsPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const productId = params.id;
  const productById = await getProductById(productId);
  const relatedProducts = await getAllProductsByCategory(
    productById?.categoryId,
  );

  return (
    <ProductDetails product={productById} relatedProducts={relatedProducts} />
  );
}

export default ProductDetailsPage;
