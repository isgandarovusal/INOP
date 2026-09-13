const mongoose = require("mongoose");

const permissionSchema = new mongoose.Schema(
  {
    resource: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    action: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    /*
     * Data visibility / ownership scope.
     *
     * all        -> bütün uyğun məlumatlara çıxış
     * department -> yalnız öz department məlumatları
     * assigned   -> yalnız istifadəçiyə təyin olunmuş məlumatlar
     * own        -> yalnız öz yaratdığı / öz profil məlumatları
     * none       -> əməliyyata icazə yoxdur
     */
    scope: {
      type: String,
      enum: ["all", "department", "assigned", "own", "none"],
      default: "all",
    },
  },
  {
    _id: false,
  }
);

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    permissions: {
      type: [permissionSchema],
      default: [],
    },

    isSystemRole: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.Role || mongoose.model("Role", roleSchema);
