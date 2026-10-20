import { useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../Context/useAuth';
import api from '../../api/axios';
import { clearAuthToken } from '../../Services/authService';
import { isAxiosError } from 'axios';
import toast from 'react-hot-toast';
import PageHeader from '../../Components/PageHeader';
export default function Profile() {
  const {t}=useTranslation();const {user}=useAuth();
  const [currentPassword,setCurrent]=useState(''),[newPassword,setNew]=useState(''),[confirm,setConfirm]=useState('');
  const [saving,setSaving]=useState(false),[error,setError]=useState('');
  const submit=async(e:FormEvent)=>{e.preventDefault();if(saving)return;
    if(!currentPassword || newPassword.length<12 || !/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword) || new TextEncoder().encode(newPassword).length>72 || newPassword===currentPassword || confirm!==newPassword){setError(t('adminUI.passwordRules'));return;}
    setSaving(true);setError('');try {
      await api.post('/auth/change-password',{currentPassword,newPassword},{suppressErrorToast:true});
      setCurrent('');setNew('');setConfirm('');clearAuthToken();toast.success(t('adminUI.passwordChanged'));
      window.dispatchEvent(new CustomEvent('inop:auth-expired'));
    }catch(err){setError(t(isAxiosError(err)&&err.response?.data?.code==='CURRENT_PASSWORD_INVALID'?'adminUI.currentPasswordInvalid':isAxiosError(err)&&err.response?.status===429?'adminUI.rateLimited':'auth.somethingWentWrong'));}
    finally{setSaving(false);}
  };
  return <div className="administration-page"><PageHeader title={t('adminUI.profile')} subtitle={user?.name}/><section className="form-card administration-form"><h2>{t('adminUI.changePassword')}</h2><p className="admin-help">{t('adminUI.passwordRules')}</p>
    <form onSubmit={submit}>
      <input type="text" autoComplete="username" value={user?.email||''} readOnly hidden aria-hidden="true"/>
      {([['current-password',t('adminUI.currentPassword'),currentPassword,setCurrent,'current-password'],['new-password',t('adminUI.newPassword'),newPassword,setNew,'new-password'],['confirm-password',t('adminUI.confirmPassword'),confirm,setConfirm,'new-password']] as const).map(([id,label,value,setter,autoComplete])=><div className="form-group" key={id}><label className="form-label" htmlFor={id}>{label}</label><input id={id} type="password" className="input-field" autoComplete={autoComplete} required value={value} onChange={e=>setter(e.target.value)} disabled={saving}/></div>)}
      {error&&<p className="form-error" role="alert">{error}</p>}<button className="btn-primary" disabled={saving}>{saving?t('common.loading'):t('adminUI.changePassword')}</button>
    </form></section></div>;
}
