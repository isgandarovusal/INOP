export interface AuditSourceDocument {
  id: string;
  templateId?: string;
  name: string;
  originalName?: string;
  filePath?: string;
  uploadedBy?: string;
  createdAt?: string;
}

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api";


async function request<T>(
  path:string,
  options?:RequestInit
):Promise<T>{

  const response = await fetch(`${API_BASE}${path}`, options);

  if(!response.ok){
    const body = await response.json().catch(()=>null);
    throw new Error(
      body?.message || "Sorğu xətası"
    );
  }

  return response.json();
}


export async function getAuditSourceDocuments(
  templateId?:string
):Promise<AuditSourceDocument[]>{

  const query = templateId
    ? `?templateId=${templateId}`
    : "";

  return request(
    `/audit-source-documents${query}`
  );
}



export async function uploadAuditSourceDocument(
 file:File,
 metadata:{
  templateId?:string;
  organizationId?:string;
  brandId?:string;
  auditType?:
    | "service"
    | "standard"
    | "occupational-safety";
  uploadedBy?:string;
 }
):Promise<AuditSourceDocument>{

 const formData = new FormData();

 formData.append("file",file);
 formData.append(
  "templateId",
  metadata.templateId || ""
 );

 formData.append(
  "uploadedBy",
  metadata.uploadedBy || ""
 );


 return request(
  "/audit-source-documents",
  {
    method:"POST",
    body:formData
  }
 );

}



export async function deleteAuditSourceDocument(
 id:string
):Promise<void>{

 await request(
  `/audit-source-documents/${id}`,
  {
   method:"DELETE"
  }
 );

}
