import API from "./api";
import type { Restaurant, RestaurantStatus } from "../Types/audit";

export interface RestaurantInput {
  name: string;
  location: string;
  status: RestaurantStatus;
}

export async function getRestaurants(): Promise<Restaurant[]> {
  const res = await API.get("/restaurants");
  return res.data;
}

export async function getRestaurantById(
  id: string
): Promise<Restaurant> {
  const res = await API.get(`/restaurants/${id}`);
  return res.data;
}

export async function createRestaurant(
  input: RestaurantInput
): Promise<Restaurant> {

  const payload = {
    id: `rest-${Date.now()}`,
    createdAt: new Date().toISOString(),
    ...input,
  };

  const res = await API.post("/restaurants", payload);

  return res.data;
}

export async function updateRestaurant(
  id: string,
  input: Partial<RestaurantInput>
): Promise<Restaurant> {

  const res = await API.put(
    `/restaurants/${id}`,
    input
  );

  return res.data;
}

export async function deleteRestaurant(
  id: string
): Promise<void> {

  await API.delete(`/restaurants/${id}`);
}
