const RouteLoading: React.FC = () => {
  return (
    <div className="route-loading" role="status" aria-live="polite">
      <span className="sr-only">Yüklənir...</span>

      <div className="route-loading__content">
        <div className="route-loading__brand">INOP</div>
        <div className="route-loading__spinner" aria-hidden="true" />
      </div>

      <div className="route-loading__skeleton" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
};

export default RouteLoading;
