const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const userSchema = new mongoose.Schema(
  {
    // Basic User Details
    username: {
      type: String,
      unique: true,
      required: [true, "Please provide a username"],
    },
    email: {
      type: String,
      unique: true,
      required: [true, "Please provide your email address"],
      lowercase: true,
      validate: [validator.isEmail, "Please provide a valid email"],
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false, // Exclude the password field by default
    },
    passwordConfirm: {
      type: String,
      required: [true, "Please confirm your password"],
      validate: {
        // This only works on CREATE and SAVE
        validator: function (el) {
          return el === this.password;
        },
        message: "Passwords are not the same",
      },
    },

    // Personal Information
    firstName: {
      type: String,
      maxlength: [30, "Your first name must be less or equal to 30 characters"],
    },
    lastName: {
      type: String,
      maxlength: [50, "Your last name must be less or equal to 50 characters"],
    },
    dateOfBirth: {
      type: Date,
    },
    profilePicture: {
      default: { type: String, default: "server/public/Default.png" },
      url: String,
      filename: String,
    },

    // Language Proficiency
    languages: {
      native: {
        type: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Language",
          },
        ],
      },
      fluent: {
        type: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Language",
          },
        ],
      },
      learning: {
        type: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Language",
          },
        ],
      },
    },

    // About User
    about: {
      talkAbout: {
        type: String,
        maxlength: [250, "Your answer must be less or equal to 250 characters"],
      },
      perfectPartner: {
        type: String,
        maxlength: [250, "Your answer must be less or equal to 250 characters"],
      },
      learningGoals: {
        type: String,
        maxlength: [250, "Your answer must be less or equal to 250 characters"],
      },
    },

    // Additional Photos
    photos: [
      {
        url: {
          type: String,
        },
        filename: {
          type: String,
        },
      },
    ],

    // User's Location
    location: {
      type: {
        type: String,
        default: "Point",
        enum: ["Point"],
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        index: "2dsphere", // to support geospatial queries
      },
      locationString: {
        type: String,
        trim: true,
      },
    },

    // User's Events
    events: [
      {
        event: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Event",
        },
        relationship: {
          type: String,
          enum: ["created", "going", "interested"],
        },
      },
    ],

    // Roles and Permissions
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    // Profile Completion Status
    profileCompleted: { type: Boolean, default: false }, // Set to true when user completes profile

    // Password management fields
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    accountActive: {
      type: Boolean,
      default: true,
    },
    currentlyActive: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual property to calculate user's age
userSchema.virtual("age").get(function () {
  if (!this.dateOfBirth) return undefined;

  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age;
});

// Middleware to hash password before saving
userSchema.pre("save", async function (next) {
  // Only hash the password if it has been modified or is new
  if (!this.isModified("password")) return next();

  // Generate a salt for the password hash
  this.password = await bcrypt.hash(this.password, 10);

  // Delete passwordConfirm field
  this.passwordConfirm = undefined;

  next();
});

// Middleware to exclude inactive users from query results
userSchema.pre(/^find/, function (next) {
  // "this" points to the current query
  this.find({ accountActive: { $ne: false } });
  next();
});

// Method to compare passwords for login
userSchema.methods.comparePassword = async function (
  candidatePassword,
  userPassword
) {
  // Use bcrypt to compare the candidate password to the hashed user password
  return userPassword
    ? await bcrypt.compare(candidatePassword, userPassword)
    : false;
};

// Method to check if password was changed after a token was issued
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  // If the passwordChangedAt property exists, compare it to the JWT issue time
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return JWTTimestamp < changedTimestamp;
  }

  // False means NOT changed
  return false;
};

// Method to create a hashed password reset token
userSchema.methods.createPasswordResetToken = function () {
  // Generate a random token using crypto
  const resetToken = crypto.randomBytes(32).toString("hex");

  // Hash the token using sha256 and save it to the user document
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // Set the password reset token expiration time to 10 minutes from now
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  // Return the unhashed token to send in the password reset email
  return resetToken;
};

// Middleware to update `passwordChangedAt` timestamp when password changes
userSchema.pre("save", function (next) {
  // Only update the timestamp if the password has been modified and the document is not new
  if (!this.isModified("password") || this.isNew) return next();

  // Subtract 1 second from the current time to ensure the timestamp is earlier than the JWT issue time
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

const User = mongoose.model("User", userSchema);

module.exports = User;
