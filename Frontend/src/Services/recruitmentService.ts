import API from './api';

export const recruitmentService = {
  // Jobs
  getJobs: () => API.get('/jobs'),
  getJobById: (id: string) => API.get(`/jobs/${id}`),
  createJob: (data: any) => API.post('/jobs', data),
  updateJob: (id: string, data: any) => API.put(`/jobs/${id}`, data),
  deleteJob: (id: string) => API.delete(`/jobs/${id}`),

  // Candidates
  getCandidates: () => API.get('/candidates'),
  getCandidateById: (id: string) => API.get(`/candidates/${id}`),
  createCandidate: (formData: FormData) => API.post('/candidates', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteCandidate: (id: string) => API.delete(`/candidates/${id}`),

  // Applications
  getApplications: () => API.get('/applications'),
  createApplication: (data: { jobId: string; candidateId: string; notes?: string }) => API.post('/applications', data),
  updateApplicationStatus: (id: string, status: string) => API.patch(`/applications/${id}/status`, { status }),
  deleteApplication: (id: string) => API.delete(`/applications/${id}`),
};