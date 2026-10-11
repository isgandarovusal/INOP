import {isAxiosError} from 'axios';
// Stable presentation keys only; never render provider/raw request messages.
export function hrDocumentErrorKey(error:unknown):string {
 if(!isAxiosError(error))return 'hrDocuments.unavailable';
 const status=error.response?.status,code=error.response?.data?.code;
 if(error.response?.data?.processingStatus==='unsupported_ocr'||code==='OCR_REQUIRED')return 'cvReview.unsupported_ocr';
 if(status===413||code==='LIMIT_FILE_SIZE'||code==='DOCUMENT_LIMIT')return 'recruitment.candidateForm.cvSizeError';
 if(code==='LIMIT_UNEXPECTED_FILE'||status===415)return 'recruitment.candidateForm.cvFormatError';
 if(code==='DOCUMENT_TIMEOUT')return 'hrDocuments.timeout';
 if(status===429||code==='DOCUMENT_BUSY')return 'hrDocuments.busy';
 if(status===404)return 'hrDocuments.missing';
 if(status===409)return 'hrProcessing.error.changed';
 if(!error.response)return 'hrDocuments.network';
 if(status===400)return 'hrDocuments.invalid';
 return 'hrDocuments.unavailable';
}
