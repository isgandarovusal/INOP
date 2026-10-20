import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { AlertCircle, ArrowRight, Loader2 } from "lucide-react";
import PageHeader from "../../../Components/PageHeader";
import {
  createRestaurant,
  getRestaurantById,
  updateRestaurant,
} from "../../../Services/restaurantsService";
import type { RestaurantStatus } from "../../../Types/audit";

const RestaurantForm: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const submitLock=useRef(false);
  const [brandId,setBrandId]=useState('');
  const [originalBrand,setOriginalBrand]=useState('');
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState<RestaurantStatus>("active");

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    getRestaurantById(id)
      .then((restaurant) => {
        if (cancelled) return;

        if (!restaurant) {
          setError(t('auditFlow.restaurantNotFound'));
          return;
        }

        setBrandId(restaurant.brandId || ''); setOriginalBrand(restaurant.brandId || '');
        setName(restaurant.name ?? "");
        setLocation(restaurant.location ?? "");
        setStatus(restaurant.status ?? "active");
      })
      .catch(() => {
        if (!cancelled) {
          setError(t('auditFlow.optionsFailed'));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id, t]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if(submitLock.current)return;

    if (!name.trim() || !location.trim()) {
      setError(t('auditFlow.restaurantRequired'));
      return;
    }

    submitLock.current=true;
    setSaving(true);
    setError(null);

    try {
      const payload = {
        name: name.trim(),
        location: location.trim(),
        status,
        ...((!isEdit && brandId) || (isEdit && brandId !== originalBrand) ? { organizationId: brandId ? 'gfc' : null, brandId: brandId || null } : {}),
      };

      if (isEdit && id) {
        await updateRestaurant(id, payload);
      } else {
        await createRestaurant(payload);
      }

      navigate("/app/audit/restaurants");

    } catch {
      setError(t('auth.somethingWentWrong'));
    } finally {
      submitLock.current=false; setSaving(false);
    }
  };


  if (loading) {
    return (
      <div className="audit-modern-empty">
        <Loader2 size={24} className="spin" />
      </div>
    );
  }


  return (
    <div className="restaurant-form-page">

      <PageHeader
        title={isEdit ? t("audit.restaurants.form.titleEdit") : t("audit.restaurants.form.titleAdd")}
        subtitle={
          isEdit
            ? t("audit.restaurants.form.subtitleEdit")
            : t("audit.restaurants.form.subtitleAdd")
        }
      />


      <div className="audit-modern-card">

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group"><label className="form-label" htmlFor="restaurant-brand">{t('auditFoundation.brand')}</label><select id="restaurant-brand" className="input-field" value={brandId} onChange={e=>setBrandId(e.target.value)}><option value="">{t('adminUI.unassigned')}</option>{[['kfc','KFC'],['pizza-hut','Pizza Hut'],['simit-sarayi','Simit Sarayı']].map(([id,name])=><option key={id} value={id}>{name}</option>)}</select>{!brandId&&<p className="admin-help">{t('auditFlow.unlinkedRestaurant')}</p>}</div>


          <div className="form-group">
            <label className="form-label">
              Name
            </label>

            <input
              className="input-field"
              value={name}
              onChange={(e)=>setName(e.target.value)}
              placeholder={t("audit.restaurants.form.restaurantName")}
            />

          </div>



          <div className="form-group">
            <label className="form-label">
              Location
            </label>

            <input
              className="input-field"
              value={location}
              onChange={(e)=>setLocation(e.target.value)}
              placeholder={t("audit.restaurants.form.locationPlaceholder")}
            />

          </div>



          <div className="form-group">
            <label className="form-label">
              Status
            </label>

            <select
              className="input-field"
              value={status}
              onChange={(e)=>
                setStatus(e.target.value as RestaurantStatus)
              }
            >

              <option value="active">
                Active
              </option>

              <option value="inactive">
                Inactive
              </option>

            </select>

          </div>



          {error && (
            <p className="form-error form-error--submit">
              <AlertCircle size={12}/>
              {error}
            </p>
          )}



          <div className="form-actions">

            <button
              type="button"
              className="btn-secondary"
              onClick={() =>
                navigate("/app/audit/restaurants")
              }
            >
              Cancel
            </button>


            <button
              type="submit"
              className="btn-primary"
              disabled={saving}
            >

              {saving ? (
                <>
                  <Loader2 size={16} className="spin"/>
                  {t("audit.restaurants.form.saving")}
                </>
              ) : (
                <>
                  {isEdit
                    ? "Save changes"
                    : "Add restaurant"}

                  <ArrowRight size={16}/>
                </>
              )}

            </button>

          </div>


        </form>

      </div>

    </div>
  );
};


export default RestaurantForm;
