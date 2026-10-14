const Restaurant = require('../models/restaurant.model');
const { recordActivity } = require("../services/activityLog.service");


async function getRestaurants(req, res) {
  try {
    const restaurants = await Restaurant.find().sort({
      createdAt: -1,
    });

    res.json(restaurants);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to fetch restaurants",
    });
  }
}


async function getRestaurantById(req, res) {
  try {
    const restaurant = await Restaurant.findOne({
      id: req.params.id,
    });

    if (!restaurant) {
      return res.status(404).json({
        message: "Restaurant not found",
      });
    }

    res.json(restaurant);

  } catch(error) {
    res.status(500).json({
      message:"Failed to fetch restaurant"
    });
  }
}


async function createRestaurant(req,res){
  try{

    const restaurant = await Restaurant.create({
      id:req.body.id || `rest-${Date.now()}`,
      name:req.body.name,
      organizationId:req.body.organizationId,
      brandId:req.body.brandId,
      location:req.body.location,
      status:req.body.status || "active"
    });

    try {
      await recordActivity({
        req,
        action: "create",
        entityType: "restaurant",
        entityId: restaurant._id,
        description: `Restoran yaradıldı: ${restaurant.name}`,
      });
    } catch (activityError) {
      console.error(
        "Restaurant activity log error:",
        activityError
      );
    }


    res.status(201).json(restaurant);

  }catch(error){

    if (error?.name === 'ValidationError') return res.status(400).json({ message: 'Invalid restaurant data' });
    console.error(error);

    res.status(500).json({
      message:"Failed to create restaurant"
    });
  }
}


async function updateRestaurant(req,res){

  try{

    if (Object.hasOwn(req.body, 'id') && req.body.id !== req.params.id) return res.status(400).json({ message: 'Restaurant id cannot be changed' });
    const body = { ...req.body };
    delete body.id;
    delete body._id;
    const filter = { id: req.params.id };
    const linking = ['organizationId', 'brandId'].some(field => Object.hasOwn(body, field));
    if (linking) {
      const existing = await Restaurant.findOne(filter).lean();
      if (!existing) return res.status(404).json({ message: 'Restaurant not found' });
      for (const field of ['organizationId', 'brandId']) {
        if (!Object.hasOwn(body, field)) body[field] = existing[field] ?? null;
        filter[field] = Object.hasOwn(existing, field) ? existing[field] : { $exists: false };
      }
    }
    const restaurant =
      await Restaurant.findOneAndUpdate(
        filter,
        {$set:body},
        {returnDocument: 'after', runValidators:true}
      );


    if(!restaurant){
      return res.status(linking ? 409 : 404).json({
        message: linking ? "Restaurant relationship changed; reload and retry" : "Restaurant not found"
      });
    }

    try {
      await recordActivity({
        req,
        action: "update",
        entityType: "restaurant",
        entityId: restaurant._id,
        description: `Restoran yeniləndi: ${restaurant.name}`,
      });
    } catch (activityError) {
      console.error(
        "Restaurant activity log error:",
        activityError
      );
    }


    res.json(restaurant);


  }catch(error){

    if (error?.name === "ValidationError") {
      return res.status(400).json({
        message: "Invalid restaurant data",
        errors: Object.fromEntries(
          Object.entries(error.errors || {}).map(([field, details]) => [
            field,
            details?.message || "Invalid value",
          ])
        ),
      });
    }

    console.error(error);

    return res.status(500).json({
      message:"Failed to update restaurant"
    });

  }
}



async function deleteRestaurant(req,res){

  try{

    const restaurant =
      await Restaurant.findOneAndDelete({
        id:req.params.id
      });


    if(!restaurant){
      return res.status(404).json({
        message:"Restaurant not found"
      });
    }

    try {
      await recordActivity({
        req,
        action: "delete",
        entityType: "restaurant",
        entityId: restaurant._id,
        description: `Restoran silindi: ${restaurant.name}`,
      });
    } catch (activityError) {
      console.error(
        "Restaurant activity log error:",
        activityError
      );
    }


    res.json({
      message:"Restaurant deleted"
    });


  }catch(error){

    res.status(500).json({
      message:"Failed to delete restaurant"
    });

  }

}


module.exports = {
  getRestaurants,
  getRestaurantById,
  createRestaurant,
  updateRestaurant,
  deleteRestaurant
};
