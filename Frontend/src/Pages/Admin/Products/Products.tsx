import React, { useContext } from 'react';
import MainContext from '../../../Context/Context';
import { useNavigate } from 'react-router-dom';

const Products: React.FC = () => {
    const { products, deleteProduct } = useContext(MainContext);
    const navigate = useNavigate();
    const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:2000"

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>Products</h2>
            </div>
            
            <div className="admin-table-container glass">
                <table>
                    <thead>
                        <tr>
                            <th>Image</th>
                            <th>Title</th>
                            <th>Description</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.map(item => (
                            <tr key={item._id}>
                                <td>
                                    {item.images && item.images.length > 0 ? (
                                        <img src={`${API_URL}/${item.images[0].replace(/\\/g, '/')}`} alt={item.title} className="table-img" />
                                    ) : (
                                        <div className="table-img" style={{ background: '#333' }}></div>
                                    )}
                                </td>
                                <td>{item.title}</td>
                                <td style={{ maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {item.description}
                                </td>
                                <td>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button 
                                            className="btn btn-primary"
                                            onClick={() => navigate(`/admin/edit/${item._id}`)}
                                        >
                                            Edit
                                        </button>
                                        <button 
                                            className="btn btn-danger"
                                            onClick={() => deleteProduct(item._id)}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {products.length === 0 && (
                            <tr>
                                <td colSpan={4} style={{ textAlign: 'center' }}>No products found</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
export default Products;