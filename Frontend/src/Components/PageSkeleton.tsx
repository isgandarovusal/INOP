const PageSkeleton: React.FC = () => {
  return (
    <div className="page-skeleton" aria-hidden="true">
      <div className="page-skeleton__title page-skeleton__box" />
      <div className="page-skeleton__subtitle page-skeleton__box" />

      <div className="page-skeleton__kpis">
        <div className="page-skeleton__box" />
        <div className="page-skeleton__box" />
        <div className="page-skeleton__box" />
        <div className="page-skeleton__box" />
      </div>

      <div className="page-skeleton__charts">
        <div className="page-skeleton__box" />
        <div className="page-skeleton__box" />
      </div>
    </div>
  );
};

export default PageSkeleton;
