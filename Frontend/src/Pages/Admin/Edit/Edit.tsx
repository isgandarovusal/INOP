import React, { useContext, useEffect, useState } from 'react';
import MainContext from '../../../Context/Context';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

const Edit: React.FC = () => {
    const { editProduct } = useContext(MainContext);
    const navigate = useNavigate();
    const { id } = useParams();
    const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:2000"
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [images, setImages] = useState<FileList | null>(null);
    const [currentImages, setCurrentImages] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const res = await axios.get(`${API_URL}/products/${id}`);
                setTitle(res.data.title);
                setDescription(res.data.description);
                setCurrentImages(res.data.images || []);
            } catch (error) {
                console.error("Error fetching product:", error);
            }
        };
        if (id) fetchProduct();
    }, [id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id) return;
        setLoading(true);

        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);

        if (images) {
            for (let i = 0; i < images.length; i++) {
                formData.append('images', images[i]);
            }
        }

        try {
            await editProduct(id, formData);
            navigate('/admin/products');
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <h2>Edit Product</h2>
            <div className="form-container glass">
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Title</label>
                        <input 
                            type="text" 
                            className="input" 
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required 
                        />
                    </div>
                    <div className="form-group">
                        <label>Description</label>
                        <textarea 
                            className="input" 
                            rows={4}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            required 
                        ></textarea>
                    </div>
                    <div className="form-group">
                        <label>Current Images</label>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                            {currentImages.map((img, index) => (
                                <img 
                                    key={index} 
                                    src={`${API_URL}/${img.replace(/\\/g, '/')}`} 
                                    alt={`current-${index}`} 
                                    style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '0.5rem' }} 
                                />
                            ))}
                        </div>
                    </div>
                    <div className="form-group">
                        <label>New Images (optional)</label>
                        <input 
                            type="file" 
                            className="input" 
                            multiple
                            onChange={(e) => setImages(e.target.files)}
                        />
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                </form>
            </div>
        </div>
    )
}
export default Edit;
