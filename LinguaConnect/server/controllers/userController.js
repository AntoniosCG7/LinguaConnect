const User = require("../models/userModel");
const Language = require("../models/languageModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

// Get all users
exports.getAllUsers = catchAsync(async (req, res, next) => {
  const users = await User.find();

  res.status(200).json({
    status: "success",
    results: users.length,
    data: {
      users,
    },
  });
});

// Get a user
exports.getSingleUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new AppError("No user found with that ID", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      user,
    },
  });
});

// Function to filter an object and only keep specified fields
function filterObj(obj, ...allowedFields) {
  const newObj = {};

  // A helper function to set a value at a given path within an object.
  // If any part of the path doesn't exist, it will be created.
  function setValue(targetObj, path, value) {
    const keys = path.split(".");
    let current = targetObj;

    // Navigate to the second last key in the path,
    // creating any missing objects along the way.
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }

    // Set the value on the last key in the path.
    current[keys[keys.length - 1]] = value;
  }

  // Iterate over each allowed field to process it.
  allowedFields.forEach((field) => {
    const keys = field.split(".");
    let current = obj;

    // Attempt to navigate to the depth specified by the field in the source object.
    for (let key of keys) {
      if (!current[key]) {
        // Part of the specified path doesn't exist in the source object.
        break;
      }
      current = current[key];
    }

    // If we navigated to the end of the keys array, the field exists.
    if (current !== obj) {
      setValue(newObj, field, Array.isArray(current) ? [...current] : current);
    }
  });

  return newObj;
}

// Update user profile details
exports.updateUser = catchAsync(async (req, res, next) => {
  // Create a filtered object containing only the fields that are allowed to be updated
  const filteredBody = filterObj(
    req.body,
    "username",
    "email",
    "firstName",
    "lastName",
    "dateOfBirth",
    "profilePicture",
    "languages.native",
    "languages.fluent",
    "languages.learning",
    "about.talkAbout",
    "about.perfectPartner",
    "about.learningGoals",
    "photos",
    "location.coordinates",
    "location.city",
    "location.country",
    "role",
    "active",
    "events"
  );

  const updatedUser = await User.findByIdAndUpdate(
    req.params.id,
    filteredBody,
    {
      new: true,
      runValidators: true,
    }
  );

  if (!updatedUser) {
    return next(new AppError("No user found with that ID", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      user: updatedUser,
    },
  });
});

// Delete a user
exports.deleteUser = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndDelete(req.params.id);

  if (!user) {
    return next(new AppError("No user found with that ID", 404));
  }

  res.status(204).json({
    status: "success",
    data: null,
  });
});

// Get current user's data
exports.getMe = catchAsync(async (req, res, next) => {
  // Since the user is authenticated (protected route), req.user should contain the user's data.
  const user = await User.findById(req.user.id)
    .populate("languages.native")
    .populate("languages.fluent")
    .populate("languages.learning");

  // Respond with the user's data
  res.status(200).json({
    status: "success",
    data: {
      user,
    },
  });
});

// Update the current user's data
exports.updateMe = catchAsync(async (req, res, next) => {
  // Check if user is trying to update their password
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        "This route is not for password updates. Please use the updatePassword route.",
        400
      )
    );
  }

  // Flatten request body for simpler processing
  let updateData = { ...req.body };

  // Convert flat location data to structured format
  updateData.location = {
    type: "Point",
    coordinates: [
      parseFloat(updateData.longitude),
      parseFloat(updateData.latitude),
    ],
    locationString: updateData.fullAddress,
  };

  // Convert flat language data to structured format
  const allUserLanguages = [
    updateData.nativeLanguage,
    ...updateData.fluentLanguages.split(","),
    ...updateData.learningLanguages.split(","),
  ];

  // Fetch the language ObjectIds from the database
  const languageDocs = await Language.find({ name: { $in: allUserLanguages } });

  // Map language names to their corresponding ObjectIds
  const nameToIdMap = {};
  languageDocs.forEach((doc) => {
    nameToIdMap[doc.name] = doc._id;
  });

  // Create a languages object containing the ObjectIds of the user's languages
  updateData.languages = {
    native: [nameToIdMap[updateData.nativeLanguage]],
    fluent: updateData.fluentLanguages
      .split(",")
      .map((name) => nameToIdMap[name]),
    learning: updateData.learningLanguages
      .split(",")
      .map((name) => nameToIdMap[name]),
  };

  // Convert flat about data to structured format
  updateData.about = {
    talkAbout: updateData.talkAbout,
    perfectPartner: updateData.perfectPartner,
    learningGoals: updateData.learningGoals,
  };

  // Check if the user uploaded a profile picture
  let profilePicturePath;
  if (req.file) {
    profilePicturePath = req.file.path;
  } else if (
    req.user &&
    req.user.profilePicture &&
    req.user.profilePicture.url
  ) {
    // If no new file is uploaded, retain the existing profile picture URL
    profilePicturePath = req.user.profilePicture.url;
  } else {
    // Default picture
    profilePicturePath = "/assets/images/Default.png";
  }

  // Extract profile picture data from req.file or existing data
  const profilePicture = {
    url: profilePicturePath,
    filename: req.file
      ? req.file.filename
      : (req.user &&
          req.user.profilePicture &&
          req.user.profilePicture.filename) ||
        "Default.png",
  };

  // Update the profilePicture property of the updateData object
  updateData.profilePicture = profilePicture;

  // Use the filterObj to filter out unwanted fields
  const filteredBody = filterObj(
    updateData,
    ...[
      "username",
      "email",
      "firstName",
      "lastName",
      "dateOfBirth",
      "location",
      "profilePicture",
      "languages.native",
      "languages.fluent",
      "languages.learning",
      "about.talkAbout",
      "about.perfectPartner",
      "about.learningGoals",
    ]
  );

  // Update the user document
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  // Check if update was successful
  if (!updatedUser) {
    return next(
      new AppError(
        "Failed to update user. Please check the provided data and try again.",
        500
      )
    );
  }

  // Send the updated user data as a response
  res.status(200).json({
    status: "success",
    data: {
      user: updatedUser,
    },
  });
});

// Perform a "soft delete" on the current user
exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  // 204 status code means "No Content"
  res.status(204).json({
    status: "success",
    data: null,
  });
});

// Create a user profile
exports.createProfile = catchAsync(async (req, res, next) => {
  // Extract profile data from req.body
  const { firstName, lastName, dateOfBirth } = req.body;

  // Check if the user uploaded a profile picture
  let profilePicturePath;
  if (req.file) {
    profilePicturePath = req.file.path;
  } else {
    profilePicturePath = "/assets/images/Default.png";
  }

  // Extract profile picture data from req.file
  const profilePicture = {
    url: profilePicturePath,
    filename: req.file ? req.file.filename : "Default.png",
  };

  // Extract and restructure location data from req.body
  const location = {
    coordinates: [
      parseFloat(req.body.longitude),
      parseFloat(req.body.latitude),
    ],
    locationString: req.body.fullAddress,
  };

  const userLanguages = {
    native: req.body.nativeLanguage.split(",").map((lang) => lang.trim()),
    fluent: req.body.fluentLanguages.split(",").map((lang) => lang.trim()),
    learning: req.body.learningLanguages.split(",").map((lang) => lang.trim()),
  };

  // Flatten all user provided languages
  const allUserLanguages = [
    ...userLanguages.native,
    ...userLanguages.fluent,
    ...userLanguages.learning,
  ];

  // Fetch the language ObjectIds from the database
  const languageDocs = await Language.find({
    name: { $in: allUserLanguages },
  });

  // Map language names to their corresponding ObjectIds
  const nameToIdMap = {};
  languageDocs.forEach((doc) => {
    nameToIdMap[doc.name] = doc._id;
  });

  // Create a languages object containing the ObjectIds of the user's languages
  const languages = {
    native: userLanguages.native.map((name) => nameToIdMap[name]),
    fluent: userLanguages.fluent.map((name) => nameToIdMap[name]),
    learning: userLanguages.learning.map((name) => nameToIdMap[name]),
  };

  // Create an about object containing the user's answers to the about questions
  const about = {
    talkAbout: req.body.talkAbout,
    perfectPartner: req.body.perfectPartner,
    learningGoals: req.body.learningGoals,
  };

  // Update the user document
  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    {
      firstName,
      lastName,
      dateOfBirth,
      languages,
      about,
      profilePicture,
      location,
      profileCompleted: true,
    },
    {
      new: true, // This returns the modified document
      runValidators: true, // Validates the updated document before saving
    }
  );

  // Send a response
  res.status(200).json({
    status: "success",
    data: {
      user: updatedUser,
    },
  });
});
