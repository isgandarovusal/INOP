import {Navigate} from 'react-router-dom';
import {useAuth} from '../Context/useAuth';
import {workspaceHome} from '../Utils/workspaceHome';
export default function WorkspaceLanding(){
 const{user,isLoading}=useAuth();
 // Login already renders safely during hydration and resumes a verified session.
 // Redirect now so a rejected/slow stored token never hides or remounts its form.
 return <Navigate to={isLoading?'/login':workspaceHome(user)} replace/>;
}
