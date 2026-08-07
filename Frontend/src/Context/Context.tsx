import { createContext } from "react";
import type { Product } from "../Types/Product";

interface MainContextType {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  fetchProducts: () => void;
  deleteProduct: (id: string) => void;
  addProduct: (formData: FormData) => Promise<void>;
  editProduct: (id: string, formData: FormData) => Promise<void>;
}

const MainContext = createContext<MainContextType>({
  products: [],
  setProducts: () => {},
  fetchProducts: () => {},
  deleteProduct: () => {},
  addProduct: async () => {},
  editProduct: async () => {},
});

export default MainContext;
