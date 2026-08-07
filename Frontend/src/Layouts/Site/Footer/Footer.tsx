import React from "react"

const Footer: React.FC = () => {
    return (
        <footer className="site-footer">
            <p>&copy; {new Date().getFullYear()} Beautiful Store. All rights reserved.</p>
        </footer>
    )
}
export default Footer;