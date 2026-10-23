import {Navigate} from 'react-router-dom';
import {useAuth} from '../Context/useAuth';
import {workspaceHome} from '../Utils/workspaceHome';
import PageState from '../Components/PageState';
export default function WorkspaceLanding(){const{user,isLoading}=useAuth();return isLoading?<PageState type='loading'/>:<Navigate to={workspaceHome(user)} replace/>;}
