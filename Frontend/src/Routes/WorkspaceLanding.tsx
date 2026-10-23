import {Navigate} from 'react-router-dom';
import {useAuth} from '../Context/useAuth';
import {workspaceHome} from '../Utils/workspaceHome';
import HRResourceState from '../Components/HRResourceState';
export default function WorkspaceLanding(){const{user,isLoading}=useAuth();return isLoading?<HRResourceState status='loading'/>:<Navigate to={workspaceHome(user)} replace/>;}
