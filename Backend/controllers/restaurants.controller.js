const { randomUUID } = require("node:crypto");
const Restaurant = require("../models/restaurant.model");
const { recordActivity } = require("../services/activityLog.service");
const { listRecords, searchFilter } = require("../utils/listQuery");
const { sendError } = require("../utils/sendError");

function invalid(message, status = 400) {
  return Object.assign(new Error(message), { status });
}

function scopedQuery(req, extra = {}) {
  if (!req.dataScope || typeof req.dataScope !== "object" || Array.isArray(req.dataScope)) {
    throw invalid("Restaurant access scope is required.", 403);
  }
  return { $and: [{ deletedAt: null }, req.dataScope, extra] };
}

function identifier(req) {
  const id = req.params?.id;
  if (typeof id !== "string" || !id.trim() || id.length > 200 || /[\x00-\x1f\x7f]/.test(id)) {
    throw invalid("Invalid restaurant ID.");
  }
  return id;
}

function restaurantInput(body, creating = false) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw invalid("Invalid restaurant data.");
  if (!creating && Object.hasOwn(body, "id")) throw invalid("Restaurant ID cannot be changed.");
  const result = {};
  for (const [field, maximum] of [["name", 200], ["location", 500]]) {
    if (!Object.hasOwn(body, field)) continue;
    if (typeof body[field] !== "string" || body[field].length > maximum || /[\x00-\x1f\x7f]/.test(body[field])) {
      throw invalid(`Invalid restaurant ${field}.`);
    }
    result[field] = body[field].trim();
  }
  if ((creating && !result.name) || result.name === "") throw invalid("Restaurant name is required.");
  if (Object.hasOwn(body, "status")) {
    if (!["active", "inactive"].includes(body.status)) throw invalid("Invalid restaurant status.");
    result.status = body.status;
  }
  if (!creating && !Object.keys(result).length) throw invalid("No editable restaurant fields were supplied.");
  return result;
}

async function logActivity(req, action, restaurant) {
  try {
    await recordActivity({ req, action, entityType: "restaurant", entityId: restaurant._id,
      description: `Restaurant ${action}: ${restaurant.name}` });
  } catch (error) {
    console.error(`Restaurant activity log failed (${error?.name || "Error"}).`);
  }
}

async function getRestaurants(req, res) {
  try {
    const restaurants = await listRecords(Restaurant,
      scopedQuery(req, searchFilter(req.query || {}, ["name", "location"])), req, res);
    return res.json(restaurants);
  } catch (error) {
    return sendError(res, error, "Failed to fetch restaurants.");
  }
}

async function getRestaurantById(req, res) {
  try {
    const restaurant = await Restaurant.findOne(scopedQuery(req, { id: identifier(req) })).lean();
    if (!restaurant) return res.status(404).json({ message: "Restaurant not found." });
    return res.json(restaurant);
  } catch (error) {
    return sendError(res, error, "Failed to fetch restaurant.");
  }
}

async function createRestaurant(req, res) {
  try {
    scopedQuery(req);
    if (!req.user?.id) throw invalid("Authentication required.", 401);
    const payload = restaurantInput(req.body, true);
    const restaurant = await Restaurant.create({
      ...payload,
      id: `rest-${randomUUID()}`,
      createdBy: req.user.id,
      departmentId: req.user.departmentId || "",
      assignedTo: req.permission?.scope === "assigned" ? req.user.id : null,
    });
    await logActivity(req, "create", restaurant);
    return res.status(201).json(restaurant);
  } catch (error) {
    return sendError(res, error, "Failed to create restaurant.");
  }
}

async function updateRestaurant(req, res) {
  try {
    const query = scopedQuery(req, { id: identifier(req) });
    const payload = restaurantInput(req.body);
    const restaurant = await Restaurant.findOneAndUpdate(query,
      { $set: payload }, { returnDocument: "after", runValidators: true });
    if (!restaurant) return res.status(404).json({ message: "Restaurant not found." });
    await logActivity(req, "update", restaurant);
    return res.json(restaurant);
  } catch (error) {
    return sendError(res, error, "Failed to update restaurant.");
  }
}

async function deleteRestaurant(req, res) {
  try {
    // Preserve the stable restaurant identifier used by historical audit rows.
    const restaurant = await Restaurant.findOneAndUpdate(scopedQuery(req, { id: identifier(req) }),
      { $set: { deletedAt: new Date(), status: "inactive" } }, { returnDocument: "after", runValidators: true });
    if (!restaurant) return res.status(404).json({ message: "Restaurant not found." });
    await logActivity(req, "delete", restaurant);
    return res.json({ message: "Restaurant deleted." });
  } catch (error) {
    return sendError(res, error, "Failed to delete restaurant.");
  }
}

module.exports = { getRestaurants, getRestaurantById, createRestaurant, updateRestaurant, deleteRestaurant };
