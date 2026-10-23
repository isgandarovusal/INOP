import {hasHRAccess,hasPermission,canAccessSection} from './permissions';
import type {PublicUser} from '../Types/auth';
export function workspaceHome(user:PublicUser|null):string{
 if(!user)return '/login';
 if(user.role!=='admin'&&hasHRAccess(user)){
  if(hasPermission(user,'application','read')&&hasPermission(user,'recruitment','read'))return '/app/recruitment/analytics';
  if(hasPermission(user,'candidate','read'))return '/app/recruitment/candidates';
  if(hasPermission(user,'recruitment','read'))return '/app/recruitment/jobs';
  if(hasPermission(user,'application','read'))return '/app/recruitment/applications';
 }
 if(canAccessSection(user,'dashboard'))return '/app/dashboard';
 if(hasPermission(user,'audit','read'))return '/app/audit';
 return '/app/profile';
}
