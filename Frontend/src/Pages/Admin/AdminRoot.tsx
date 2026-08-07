import { Outlet } from "react-router-dom"
import Header from "../../Layouts/Admin/Header/Header"

const AdminRoot: React.FC = () => {
    return (
        <div className="admin-layout">
            <Header /> {/* Header acts as Sidebar here */}
            <main className="admin-main">
                <Outlet />
            </main>
        </div>
    )
}
export default AdminRoot