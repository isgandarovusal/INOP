import API from '../api/axios';
import { readJson } from '../api/readRequest';
export interface RecruitmentBrand { id: string; name: string; active: boolean }
export interface RecruitmentBranch { _id: string; code: string; name: string; brandId: string | null; kind: 'restaurant' | 'office' | 'warehouse' | 'remote'; location: string; status: 'active' | 'inactive' }
export async function getRecruitmentCatalog(_id: string, signal?: AbortSignal, scopeKey?: string) {
  const [brands, branches] = await Promise.all([
    readJson<RecruitmentBrand[]>('/hr/brands', { signal, scopeKey }),
    readJson<RecruitmentBranch[]>('/hr/branches', { signal, scopeKey }),
  ]);
  return { brands, branches };
}
export async function createRecruitmentBrand(id: string, name: string) {
  return (await API.post<RecruitmentBrand>('/hr/brands', { id, name })).data;
}
export async function createRecruitmentBranch(input: Omit<RecruitmentBranch, '_id' | 'status' | 'location'> & { location?: string }) {
  return (await API.post<RecruitmentBranch>('/hr/branches', input)).data;
}
// Known catalog labels are not access grants. Unknown legacy values stay unset.
export function brandLabel(id?: string | null) {
  return ({ kfc: 'KFC', 'pizza-hut': 'Pizza Hut', 'simit-sarayi': 'Simit Sarayı' } as Record<string, string>)[id || ''] || id || '';
}
