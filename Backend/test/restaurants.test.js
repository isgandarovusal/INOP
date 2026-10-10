const test = require("node:test");
const assert = require("node:assert/strict");
const Restaurant = require("../models/restaurant.model");
const ActivityLog = require("../models/activityLog.model");
const controllers = require("../controllers/restaurants.controller");

const ACTOR = "507f1f77bcf86cd799439011";
const OTHER = "507f1f77bcf86cd799439012";
const ID = "rest-historical-123";

function response() {
  return { statusCode: 200, headers: {}, status(value) { this.statusCode = value; return this; },
    json(value) { this.body = value; return this; }, setHeader(key, value) { this.headers[key] = value; } };
}

function request(body = {}, overrides = {}) {
  return { body, query: {}, params: { id: ID }, dataScope: {}, user: { id: ACTOR, departmentId: "dep_hr" },
    permission: { resource: "restaurant", scope: "all" }, ...overrides };
}

function mockActivity(t) {
  return t.mock.method(ActivityLog, "create", async () => ({}));
}

test("restaurant lists preserve array responses with scoped search and bounded pagination", async (t) => {
  const scope = { departmentId: "dep_hr" };
  const records = [{ id: ID, name: "Fixture", departmentId: "dep_hr" }];
  let filter;
  const operations = {};
  const query = { lean: async () => records };
  for (const name of ["sort", "skip", "limit"]) query[name] = (value) => { operations[name] = value; return query; };
  t.mock.method(Restaurant, "find", (value) => { filter = value; return query; });
  t.mock.method(Restaurant, "countDocuments", async (value) => { assert.deepEqual(value, filter); return 7; });
  const res = response();
  await controllers.getRestaurants(request({}, { dataScope: scope, query: { search: "(Cafe).*", limit: "2", page: "2" } }), res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, records);
  assert.deepEqual(filter.$and[0], { deletedAt: null });
  assert.deepEqual(filter.$and[1], scope);
  assert.equal(filter.$and[2].$or[0].name.$regex, "\\(Cafe\\)\\.\\*");
  assert.equal(operations.skip, 2);
  assert.equal(operations.limit, 2);
  assert.equal(res.headers["X-Total-Count"], "7");
  assert.equal(res.headers["X-Next-Page"], "3");
});

test("read, update and delete apply the actor scope together with ID and deletion filters", async (t) => {
  mockActivity(t);
  const observed = [];
  t.mock.method(Restaurant, "findOne", (filter) => {
    observed.push(filter);
    return { lean: async () => null };
  });
  t.mock.method(Restaurant, "findOneAndUpdate", async (filter) => { observed.push(filter); return null; });
  const scopes = [{ createdBy: ACTOR }, { departmentId: "dep_hr" }, { assignedTo: ACTOR }];
  for (const scope of scopes) {
    for (const controller of [controllers.getRestaurantById, controllers.updateRestaurant, controllers.deleteRestaurant]) {
      const res = response();
      await controller(request({ name: "Changed" }, { dataScope: scope }), res);
      assert.equal(res.statusCode, 404);
      assert.deepEqual(observed.at(-1).$and, [{ deletedAt: null }, scope, { id: ID }]);
    }
  }
});

test("restaurant controllers fail closed when authorization did not establish a data scope", async (t) => {
  const fail = () => assert.fail("database access must not happen without a scope");
  for (const method of ["find", "findOne", "findOneAndUpdate", "create"]) t.mock.method(Restaurant, method, fail);
  for (const controller of Object.values(controllers)) {
    const res = response();
    await controller(request({ name: "Fixture" }, { dataScope: undefined }), res);
    assert.equal(res.statusCode, 403);
  }
});

test("creation accepts the existing frontend shape while deriving IDs and ownership on the server", async (t) => {
  mockActivity(t);
  const payloads = [];
  t.mock.method(Restaurant, "create", async (payload) => { payloads.push(payload); return new Restaurant(payload); });
  const body = { name: "  Cafe  ", location: "  Baku  ", status: "active", id: "rest-frontend-timestamp",
    createdAt: "1990-01-01T00:00:00Z", createdBy: OTHER, departmentId: "dep_foreign", assignedTo: OTHER,
    deletedAt: "2020-01-01", "$set": { name: "Injected" } };
  for (let i = 0; i < 2; i++) {
    const res = response();
    await controllers.createRestaurant(request(body), res);
    assert.equal(res.statusCode, 201);
    assert.equal(res.body.name, "Cafe");
    assert.equal(res.body.location, "Baku");
  }
  assert.notEqual(payloads[0].id, payloads[1].id);
  for (const payload of payloads) {
    assert.match(payload.id, /^rest-[0-9a-f-]{36}$/);
    assert.equal(payload.createdBy, ACTOR);
    assert.equal(payload.departmentId, "dep_hr");
    assert.equal(payload.assignedTo, null);
    assert.equal(Object.hasOwn(payload, "createdAt"), false);
    assert.equal(Object.hasOwn(payload, "deletedAt"), false);
    assert.equal(Object.hasOwn(payload, "$set"), false);
  }
  const res = response();
  await controllers.createRestaurant(request({ name: "Assigned cafe" }, { permission: { resource: "restaurant", scope: "assigned" },
    dataScope: { assignedTo: ACTOR } }), res);
  assert.equal(payloads.at(-1).assignedTo, ACTOR);
});

test("update whitelists restaurant fields and prevents changing stable identifiers", async (t) => {
  mockActivity(t);
  let captured;
  const update = t.mock.method(Restaurant, "findOneAndUpdate", async (_filter, payload, options) => {
    captured = { payload, options };
    return { _id: ACTOR, id: ID, name: payload.$set.name };
  });
  let res = response();
  await controllers.updateRestaurant(request({ name: " Changed ", location: " City ", status: "inactive",
    createdBy: OTHER, departmentId: "foreign", assignedTo: OTHER, deletedAt: null, "name.foo": "malicious" }), res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(captured.payload.$set, { name: "Changed", location: "City", status: "inactive" });
  assert.equal(captured.options.runValidators, true);
  res = response();
  await controllers.updateRestaurant(request({ id: "rest-moved", name: "Changed" }), res);
  assert.equal(res.statusCode, 400);
  assert.equal(update.mock.callCount(), 1);
});

test("malformed restaurant fields never reach persistence", async (t) => {
  const persist = t.mock.method(Restaurant, "create", () => assert.fail("invalid payload reached persistence"));
  for (const body of [null, [], { name: " " }, { name: { "$gt": "" } }, { name: "a".repeat(201) },
    { name: "bad\nname" }, { name: "Cafe", location: {} }, { name: "Cafe", location: "x".repeat(501) },
    { name: "Cafe", status: "completed" }, { name: "Cafe", status: ["active"] }]) {
    const res = response();
    await controllers.createRestaurant(request(body), res);
    assert.equal(res.statusCode, 400);
  }
  assert.equal(persist.mock.callCount(), 0);
  const res = response();
  await controllers.getRestaurantById(request({}, { params: { id: { "$ne": null } } }), res);
  assert.equal(res.statusCode, 400);
});

test("deletion preserves the restaurant and historical audit reference while preventing reuse", async (t) => {
  mockActivity(t);
  const restaurant = { _id: ACTOR, id: ID, name: "Historical cafe", status: "active", deletedAt: null };
  const historicalAudit = { id: "audit-historical", restaurantId: ID, status: "completed" };
  t.mock.method(Restaurant, "findOneAndDelete", () => assert.fail("restaurant history must not be hard-deleted"));
  t.mock.method(Restaurant, "findOneAndUpdate", async (filter, update, options) => {
    assert.equal(options.runValidators, true);
    assert.deepEqual(filter.$and[0], { deletedAt: null });
    if (restaurant.deletedAt !== null) return null;
    Object.assign(restaurant, update.$set);
    return restaurant;
  });
  t.mock.method(Restaurant, "findOne", (filter) => {
    assert.deepEqual(filter.$and[0], { deletedAt: null });
    return { lean: async () => restaurant.deletedAt === null ? restaurant : null };
  });
  const res = response();
  await controllers.deleteRestaurant(request(), res);
  assert.equal(res.statusCode, 200);
  assert.equal(restaurant.id, historicalAudit.restaurantId);
  assert.equal(restaurant.status, "inactive");
  assert.ok(restaurant.deletedAt instanceof Date);
  assert.deepEqual(historicalAudit, { id: "audit-historical", restaurantId: ID, status: "completed" });
  for (const controller of [controllers.getRestaurantById, controllers.updateRestaurant, controllers.deleteRestaurant]) {
    const next = response();
    await controller(request({ name: "Attempted resurrection", deletedAt: null }), next);
    assert.equal(next.statusCode, 404);
  }
  assert.equal(restaurant.name, "Historical cafe");
});

test("restaurant schema validates bounded fields and retains immutable IDs for stored records", async () => {
  const first = new Restaurant({ name: "Cafe" });
  const second = new Restaurant({ name: "Cafe" });
  await first.validate();
  assert.notEqual(first.id, second.id);
  first.isNew = false;
  const originalId = first.id;
  first.id = "rest-replacement";
  assert.equal(first.id, originalId);
  const invalid = new Restaurant({ name: "x".repeat(201), location: "x".repeat(501), status: "completed" });
  await assert.rejects(invalid.validate(), { name: "ValidationError" });
});
