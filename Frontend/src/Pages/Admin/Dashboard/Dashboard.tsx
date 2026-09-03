import React, { useContext } from "react";
import MainContext from "../../../Context/Context";

const Dashboard: React.FC = () => {
  const { products } = useContext(MainContext);

  const totalProducts = products.length;
  const totalImages = products.reduce(
    (total, product) => total + (product.images?.length || 0),
    0
  );

  const modules = [
    {
      title: "Platform Core",
      description: "Users, departments, roles and access control",
      status: "Foundation",
      className: "status-foundation",
    },
    {
      title: "HR Recruitment",
      description: "Jobs, candidates, applications and CV management",
      status: "In Progress",
      className: "status-progress",
    },
    {
      title: "Internal Audit",
      description: "Audits, scores, comments and audit history",
      status: "In Progress",
      className: "status-progress",
    },
    {
      title: "Analytics",
      description: "Centralized operational data and reporting",
      status: "Planned",
      className: "status-planned",
    },
  ];

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <p className="dashboard-eyebrow">INOP • INTERNAL OPERATIONS PLATFORM</p>
          <h1>Operations Dashboard</h1>
          <p className="dashboard-subtitle">
            Centralized view of platform activity, modules and operational data.
          </p>
        </div>
        <div className="dashboard-badge">
          <span className="status-dot"></span>
          System Online
        </div>
      </div>

      <section className="dashboard-stats">
        <div className="dashboard-stat-card glass">
          <div className="stat-icon">◉</div>
          <div>
            <span className="stat-label">Products</span>
            <strong>{totalProducts}</strong>
            <small>Current API records</small>
          </div>
        </div>

        <div className="dashboard-stat-card glass">
          <div className="stat-icon">▣</div>
          <div>
            <span className="stat-label">Uploaded Files</span>
            <strong>{totalImages}</strong>
            <small>Stored product images</small>
          </div>
        </div>

        <div className="dashboard-stat-card glass">
          <div className="stat-icon">◆</div>
          <div>
            <span className="stat-label">API</span>
            <strong>Online</strong>
            <small>Frontend connected to backend</small>
          </div>
        </div>

        <div className="dashboard-stat-card glass">
          <div className="stat-icon">↗</div>
          <div>
            <span className="stat-label">Architecture</span>
            <strong>Full Stack</strong>
            <small>React + Express + MongoDB</small>
          </div>
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="dashboard-panel glass">
          <div className="panel-heading">
            <div>
              <h2>INOP Modules</h2>
              <p>Current development status</p>
            </div>
          </div>

          <div className="module-list">
            {modules.map((module) => (
              <div className="module-row" key={module.title}>
                <div className="module-main">
                  <div className="module-icon">
                    {module.title.charAt(0)}
                  </div>
                  <div>
                    <h3>{module.title}</h3>
                    <p>{module.description}</p>
                  </div>
                </div>

                <span className={`module-status ${module.className}`}>
                  {module.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-panel glass">
          <div className="panel-heading">
            <div>
              <h2>System Overview</h2>
              <p>Current technical foundation</p>
            </div>
          </div>

          <div className="system-list">
            <div className="system-item">
              <span>Frontend</span>
              <strong>React + TypeScript</strong>
              <span className="check">✓</span>
            </div>

            <div className="system-item">
              <span>Backend</span>
              <strong>Node.js + Express</strong>
              <span className="check">✓</span>
            </div>

            <div className="system-item">
              <span>Database</span>
              <strong>MongoDB + Mongoose</strong>
              <span className="check">✓</span>
            </div>

            <div className="system-item">
              <span>API</span>
              <strong>REST + Swagger</strong>
              <span className="check">✓</span>
            </div>

            <div className="system-item">
              <span>File Upload</span>
              <strong>Multer</strong>
              <span className="check">✓</span>
            </div>

            <div className="system-item">
              <span>Containerization</span>
              <strong>Docker Compose</strong>
              <span className="check">✓</span>
            </div>
          </div>
        </div>
      </section>

      <section className="dashboard-panel glass recent-panel">
        <div className="panel-heading">
          <div>
            <h2>Recent Products</h2>
            <p>Live data received from the backend API</p>
          </div>
        </div>

        {products.length > 0 ? (
          <div className="recent-products">
            {products.slice(0, 5).map((product) => (
              <div className="recent-product" key={product._id}>
                <div className="recent-product-info">
                  <strong>{product.title}</strong>
                  <span>
                    {product.description.length > 70
                      ? `${product.description.slice(0, 70)}...`
                      : product.description}
                  </span>
                </div>
                <span className="product-count">
                  {product.images?.length || 0} images
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="dashboard-empty">
            No product data available.
          </div>
        )}
      </section>
    </div>
  );
};

export default Dashboard;
