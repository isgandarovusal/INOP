import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {useNavigate,useParams} from 'react-router-dom';
import PageHeader from '../../../Components/PageHeader';
import {FormSection} from '../../../Components/HRSection';
import AuditResourceState from '../../../Components/AuditResourceState';
import {useAuditResource} from '../../../Hooks/useAuditResource';
import {useAuditAction} from '../../../Hooks/useAuditAction';
import {useAuth} from '../../../Context/useAuth';
import {createRestaurant,getRestaurantById,updateRestaurant} from '../../../Services/restaurantsService';
import type {Restaurant,RestaurantStatus} from '../../../Types/audit';

function RestaurantEditor({restaurant}:{restaurant?:Restaurant}){
 const {t}=useTranslation();const navigate=useNavigate();const isEdit=Boolean(restaurant);
 const [brandId,setBrandId]=useState(restaurant?.brandId||'');const originalBrand=restaurant?.brandId||'';
 const [name,setName]=useState(restaurant?.name||'');const [location,setLocation]=useState(restaurant?.location||'');
 const [status,setStatus]=useState<RestaurantStatus>(restaurant?.status||'active');const [error,setError]=useState('');
 const action=useAuditAction(restaurant?.id||'new','restaurant',isEdit?'update':'create');
 return <div className="restaurant-form-page">
  <PageHeader title={t(isEdit?'audit.restaurants.form.titleEdit':'audit.restaurants.form.titleAdd')} subtitle={t(isEdit?'audit.restaurants.form.subtitleEdit':'audit.restaurants.form.subtitleAdd')}/>
  <form noValidate onSubmit={e=>{e.preventDefault();if(!name.trim()||!location.trim()){setError('auditFlow.restaurantRequired');document.getElementById(!name.trim()?'restaurant-name':'restaurant-location')?.focus();return;}setError('');
   const payload={name:name.trim(),location:location.trim(),status,...((!isEdit&&brandId)||(isEdit&&brandId!==originalBrand)?{organizationId:brandId?'gfc':null,brandId:brandId||null}:{})};
   void action.run(signal=>restaurant?updateRestaurant(restaurant.id,payload,signal):createRestaurant(payload,signal),()=>navigate('/app/audit/restaurants'));
  }}>
   <FormSection title={t('audit.generic.detail.details')} disabled={!action.allowed||action.busy}>
    <div className="audit-filter-grid">
     <label htmlFor="restaurant-brand">{t('auditFoundation.brand')}<select id="restaurant-brand" className="input-field" value={brandId} onChange={e=>setBrandId(e.target.value)}><option value="">{t('adminUI.unassigned')}</option>{[['kfc','KFC'],['pizza-hut','Pizza Hut'],['simit-sarayi','Simit Sarayı']].map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
     <label htmlFor="restaurant-name">{t('audit.restaurants.form.name')}<input id="restaurant-name" required aria-invalid={Boolean(error&&!name.trim())} aria-describedby={error?'restaurant-form-error':undefined} className="input-field" value={name} onChange={e=>setName(e.target.value)} placeholder={t('audit.restaurants.form.restaurantName')}/></label>
     <label htmlFor="restaurant-location">{t('audit.restaurants.form.location')}<input id="restaurant-location" required aria-invalid={Boolean(error&&!location.trim())} aria-describedby={error?'restaurant-form-error':undefined} className="input-field" value={location} onChange={e=>setLocation(e.target.value)} placeholder={t('audit.restaurants.form.locationPlaceholder')}/></label>
     <label htmlFor="restaurant-status">{t('audit.restaurants.form.status')}<select id="restaurant-status" className="input-field" value={status} onChange={e=>setStatus(e.target.value as RestaurantStatus)}>{['active','inactive'].map(s=><option key={s} value={s}>{t(`common.status.${s}`)}</option>)}</select></label>
    </div>{!brandId&&<p className="admin-help">{t('auditFlow.unlinkedRestaurant')}</p>}
   </FormSection>
   {error&&<p id="restaurant-form-error" className="form-error form-error--submit" role="alert">{t(error)}</p>}
   {action.status!=='ready'&&action.status!=='loading'&&<AuditResourceState status={action.status}/>}
   <div className="form-actions"><button type="button" className="btn-cancel" disabled={action.busy} onClick={()=>navigate('/app/audit/restaurants')}>{t('common.cancel')}</button><button type="submit" className="btn-primary" disabled={!action.allowed||action.busy}>{t(action.busy?'audit.restaurants.form.saving':isEdit?'audit.restaurants.form.save':'adminUI.addRestaurant')}</button></div>
  </form>
 </div>;
}
export default function RestaurantForm(){
 const {id}=useParams();const {user}=useAuth();const resource=useAuditResource(id,'restaurant',getRestaurantById,{refreshOnFocus:false,deadlineMs:15000});
 if(id&&(resource.status!=='ready'||!resource.data))return <AuditResourceState status={resource.status} retry={resource.reload}/>;
 return <RestaurantEditor key={JSON.stringify([id,user?.id,user?.role,user?.departmentId,user?.auditDirection,user?.auditDirections,user?.hrAccess,user?.permissions])} restaurant={id?resource.data:undefined}/>;
}
