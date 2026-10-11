import {isAxiosError} from 'axios';
// Translate status/codes, never an Axios request, CV payload or provider message.
export function hrCrudErrorKey(error:unknown):string {
 if(!isAxiosError(error))return 'hrErrors.unavailable';
 if(error.code==='ECONNABORTED'||error.code==='ETIMEDOUT')return 'hrErrors.timeout';
 const status=error.response?.status,code=error.response?.data?.code;
 if(status===401)return 'hrStates.unauthenticated';
 if(status===403)return 'hrStates.forbidden';
 if(status===404)return 'hrStates.not-found';
 if(status===413||code==='LIMIT_FILE_SIZE')return 'recruitment.candidateForm.cvSizeError';
 if(status===415||code==='LIMIT_UNEXPECTED_FILE')return 'recruitment.candidateForm.cvFormatError';
 if(status===409)return 'hrWorkflow.conflict';
 if(status===400||status===422)return 'hrErrors.invalid';
 if(status===429)return 'hrErrors.busy';
 if(!error.response)return 'hrErrors.network';
 return 'hrErrors.unavailable';
}
