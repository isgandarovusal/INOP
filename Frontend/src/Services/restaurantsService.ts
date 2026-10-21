import API from "../api/axios";
import {readJson} from "../api/readRequest";
import type { Restaurant, RestaurantStatus } from "../Types/audit";

export interface RestaurantInput {
  name: string;
  location: string;
  status: RestaurantStatus;
  brandId?: string | null;
  organizationId?: string | null;
}

export async function getRestaurants(): Promise<Restaurant[]> {
  const res = await API.get("/restaurants");
  return res.data;
}

export function getRestaurantById(id:string,signal?:AbortSignal,scopeKey?:string):Promise<Restaurant>{
  return readJson<Restaurant>(`/restaurants/${encodeURIComponent(id)}`,{signal,scopeKey,suppressErrorToast:true});
}

export async function createRestaurant(
  input: RestaurantInput,
  signal?:AbortSignal
): Promise<Restaurant> {

  const payload = {
    id: `rest-${Date.now()}`,
    createdAt: new Date().toISOString(),
    ...input,
  };

  const res = await API.post("/restaurants", payload,{signal,suppressErrorToast:true});

  return res.data;
}

export async function updateRestaurant(
  id: string,
  input: Partial<RestaurantInput>,
  signal?:AbortSignal
): Promise<Restaurant> {

  const res = await API.put(
    `/restaurants/${id}`,
    input,
    {signal,suppressErrorToast:true}
  );

  return res.data;
}

export async function deleteRestaurant(
  id: string
): Promise<void> {

  await API.delete(`/restaurants/${id}`);
}
