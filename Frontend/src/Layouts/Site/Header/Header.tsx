import React from "react"
import { NavLink, Link } from "react-router-dom"

const Header: React.FC = () => {
    return (
        <header className="site-header glass">
            <h2><Link to="/" style={{ color: 'white', textDecoration: 'none' }}>Store.</Link></h2>
            <nav>
                <NavLink to="/">Home</NavLink>
                <NavLink to="/shop">Shop</NavLink>
                <NavLink to="/admin" style={{ color: 'var(--accent)' }}>Admin Panel</NavLink>
            </nav>
        </header>
    )
}
export default Header;