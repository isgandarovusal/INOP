const Restaurant = require('../models/restaurant.model');


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
      location:req.body.location,
      status:req.body.status || "active"
    });


    res.status(201).json(restaurant);

  }catch(error){

    console.error(error);

    res.status(500).json({
      message:"Failed to create restaurant"
    });
  }
}


async function updateRestaurant(req,res){

  try{

    const restaurant =
      await Restaurant.findOneAndUpdate(
        {id:req.params.id},
        {$set:req.body},
        {new:true, runValidators:true}
      );


    if(!restaurant){
      return res.status(404).json({
        message:"Restaurant not found"
      });
    }


    res.json(restaurant);


  }catch(error){

    res.status(500).json({
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
