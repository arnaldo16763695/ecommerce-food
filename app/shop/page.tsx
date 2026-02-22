import PageTitle from '@/components/PageTitle'
import ProductListSec from '@/components/ProductListSec'
import { getAllProducts } from '@/lib/data/productsData'

const ShopPage = async () => {
  const allProducts = await getAllProducts()
  return (
    <>
    <PageTitle />
    <ProductListSec products={allProducts}/>
    </>
  )
}

export default ShopPage