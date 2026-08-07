import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './App.css'
import MainContext from './Context/Context'
import ROUTES from './Routes/Routes'
import { useEffect, useState } from 'react'
import axios from 'axios'
import type { Product } from './Types/Product'

const routes = createBrowserRouter(ROUTES)

function App() {
  const [products, setProducts] = useState<Product[]>([])
  const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:2000"

  const fetchProducts = async (): Promise<void> => {
    try {
      const res = await axios.get<Product[]>(`${API_URL}/products`)
      setProducts(res.data)
    } catch (error) {
      console.error("Error fetching products:", error)
    }
  }

  const deleteProduct = async (id: string): Promise<void> => {
    try {
      await axios.delete(`${API_URL}/products/${id}`)
      fetchProducts()
    } catch (error) {
      console.error("Error deleting product:", error)
    }
  }

  const addProduct = async (formData: FormData): Promise<void> => {
    try {
      await axios.post(`${API_URL}/products`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      fetchProducts()
    } catch (error) {
      console.error("Error adding product:", error)
    }
  }

  const editProduct = async (id: string, formData: FormData): Promise<void> => {
    try {
      await axios.put(`${API_URL}/products/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      fetchProducts()
    } catch (error) {
      console.error("Error editing product:", error)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  const contextData = {
    products,
    setProducts,
    fetchProducts,
    deleteProduct,
    addProduct,
    editProduct,
  }

  return (
    <MainContext.Provider value={contextData}>
      <RouterProvider router={routes} />
    </MainContext.Provider>
  )
}

export default App
