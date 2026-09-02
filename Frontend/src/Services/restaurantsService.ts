import { makeCrud } from "./collection";
import { generateId } from "./storage";
import type { Restaurant, RestaurantStatus } from "../Types/audit";

const crud = makeCrud<Restaurant>("restaurants", "Restaurant", (r) => r.name);

export const getRestaurants = crud.getAll;
export const getRestaurantById = crud.getById;
export const updateRestaurant = crud.update;
export const deleteRestaurant = crud.remove;

export interface RestaurantInput {
  name: string;
  location: string;
  status: RestaurantStatus;
}

export async function createRestaurant(input: RestaurantInput): Promise<Restaurant> {
  const restaurant: Restaurant = {
    id: generateId("rest"),
    createdAt: new Date().toISOString(),
    ...input,
  };
  return crud.create(restaurant);
}
