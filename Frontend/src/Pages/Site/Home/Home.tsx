import React, { useContext } from "react";
import MainContext from "../../../Context/Context";

const Home: React.FC = () => {
    const { products } = useContext(MainContext);
    const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:2000"

    return (
        <div>
            <h1 style={{ marginBottom: '1rem', color: 'var(--accent)' }}>Our Products</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Discover our latest and greatest items.</p>
            
            <div className="products-grid">
                {products.map(item => (
                    <div key={item._id} className="product-card glass">
                        {item.images && item.images.length > 0 ? (
                            <img src={`${API_URL}/${item.images[0].replace(/\\/g, '/')}`} alt={item.title} className="product-img" />
                        ) : (
                            <div className="product-img" style={{ background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>No Image</div>
                        )}
                        <div className="product-info">
                            <h3 className="product-title">{item.title}</h3>
                            <p className="product-desc">{item.description}</p>
                        </div>
                    </div>
                ))}
            </div>
            
            {products.length === 0 && (
                <div style={{ textAlign: 'center', marginTop: '3rem', color: 'var(--text-secondary)' }}>
                    No products available right now.
                </div>
            )}
        </div>
    )
}
export default Home;