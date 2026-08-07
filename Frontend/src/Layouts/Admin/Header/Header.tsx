import React from 'react';
import { NavLink } from 'react-router-dom';

const Header: React.FC = () => {
    return (
        <aside className="admin-sidebar glass">
            <h2>Admin Panel</h2>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <NavLink to="/admin" end>Dashboard</NavLink>
                <NavLink to="/admin/products">Products</NavLink>
                <NavLink to="/admin/add">Add Product</NavLink>
                <NavLink to="/" style={{ marginTop: 'auto', color: 'var(--accent)' }}>Go to Site</NavLink>
            </nav>
        </aside>
    )
}
export default Header;