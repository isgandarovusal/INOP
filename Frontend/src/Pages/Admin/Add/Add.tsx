import React, { useContext, useState } from 'react';
import MainContext from '../../../Context/Context';
import { useNavigate } from 'react-router-dom';

const Add: React.FC = () => {
    const { addProduct } = useContext(MainContext);
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [images, setImages] = useState<FileList | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
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
            await addProduct(formData);
            navigate('/admin/products');
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <h2>Add New Product</h2>
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
                        <label>Images</label>
                        <input 
                            type="file" 
                            className="input" 
                            multiple
                            onChange={(e) => setImages(e.target.files)}
                        />
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? 'Adding...' : 'Add Product'}
                    </button>
                </form>
            </div>
        </div>
    )
}
export default Add;