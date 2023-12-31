const User = require("../models/userModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const Email = require("../utils/email");
const jwt = require("jsonwebtoken");
const { promisify } = require("util");
const crypto = require("crypto");

// Function to sign a JWT token
const signToken = (id) => {
  // Sign a new JWT token with the user's ID and the JWT_SECRET
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

// Function to set cookie options
const getCookieOptions = (req) => ({
  expires: new Date(
    Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
  ),
  domain: req.hostname, // Ensures the cookie is sent only to the domain that set it
  path: "/", // Ensures the cookie is sent on all routes
  httpOnly: true, // Ensures the cookie is sent only over HTTP(S), not client JavaScript
  secure:
    process.env.NODE_ENV === "production" &&
    (req.secure || req.headers["x-forwarded-proto"] === "https"), // Use secure cookies in production
  sameSite: "strict", // Prevents the cookie from being sent in cross-site requests
});

// Function to create and send a token to the client
const createSendToken = (user, statusCode, req, res) => {
  // Sign a JWT token for the user
  const token = signToken(user._id);

  // Set the JWT as a cookie
  res.cookie("jwt", token, getCookieOptions(req));

  // Remove the password from the output for security
  user.password = undefined;

  // Send the token and user data as a response
  res.status(statusCode).json({
    status: "success",
    data: {
      user,
    },
  });
};

// Function to register a new user
exports.register = catchAsync(async (req, res, next) => {
  // Check if the provided password and password confirmation match
  if (req.body.password !== req.body.passwordConfirm) {
    return next(new AppError("Passwords do not match", 400)); // Return an error if they don't match
  }

  // Create a new user in the database, only taking specific fields to avoid potential security risks
  const newUser = await User.create({
    username: req.body.username,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
  });

  // Send a welcome email to the new user
  await new Email(newUser).sendWelcome(newUser.username);

  // Log the user in by sending them a JWT token
  createSendToken(newUser, 201, req, res);
});

// Function to log in a user
exports.login = catchAsync(async (req, res, next) => {
  // Check if the email and password were provided
  if (!req.body.email || !req.body.password) {
    return next(
      new AppError("Please provide an email and password to log in.", 400)
    );
  }

  // Find the user with the provided email and select the password field
  const user = await User.findOne({ email: req.body.email }).select(
    "+password"
  );

  // Check if the user exists and the password is correct
  if (
    !user ||
    !(await user.comparePassword(req.body.password, user.password))
  ) {
    return next(new AppError("Incorrect email or password.", 401));
  }

  // Set the user as currently active
  user.currentlyActive = true;
  await user.save({ validateBeforeSave: false });

  // Generate a JWT token for the user
  const token = signToken(user._id);

  // Send the JWT token to the client
  createSendToken(user, 200, req, res);
});

// Function to log out a user
exports.logout = catchAsync(async (req, res) => {
  // Set the JWT cookie to an empty string with an expiration date in the past
  res.cookie("jwt", "loggedout", {
    expires: new Date(Date.now() + 10 * 1000), // 10 seconds
    httpOnly: true,
  });

  // If the user is found in the request (meaning they are authenticated), set them as not currently active
  if (req.user && req.user.currentlyActive) {
    req.user.currentlyActive = false;
    await req.user.save({ validateBeforeSave: false });
  }

  // Send a success response
  res.status(200).json({
    status: "success",
    message: "Logged out successfully.",
  });
});

// Function to send a password reset email to the user
exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1. Get user based on the provided email
  const user = await User.findOne({ email: req.body.email });

  // 2. If the user doesn't exist in the database, send a 404 error response.
  if (!user) {
    return next(new AppError("There is no user with that email address.", 404));
  }

  // 3. Utilize user model's method to generate a unique password reset token. This method also hashes the token and sets the expiration date.
  const resetToken = user.createPasswordResetToken();

  // 4. Update user's document with the password reset token.
  // Disable validators to prevent validation errors during the save operation.
  await user.save({ validateBeforeSave: false });

  // 5. Construct the full URL for the password reset endpoint that includes the generated token as a parameter.
  const frontEndHost =
    process.env.NODE_ENV === "production"
      ? "linguaconnect.co"
      : "localhost:5173";
  const resetURL = `${req.protocol}://${frontEndHost}/reset-password/${resetToken}`;

  // 6. Attempt to send the password reset email to the user.
  try {
    // Create a new instance of the Email class and send the password reset email
    await new Email(user, resetURL).sendPasswordReset(user.username, resetURL);

    // 7. If email is successfully sent, respond to client indicating success.
    res.status(200).json({
      status: "success",
      message: "Password reset email sent successfully.",
    });
  } catch (err) {
    // Nullify the reset token and expiration in the user's document to ensure security.
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    // 8. Respond to the client with a 500 error indicating a problem in sending the password reset email.
    return next(
      new AppError(
        "There was an error sending the password reset email. Please try again later.",
        500
      )
    );
  }
});

// Function to reset a user's password
exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1. Hash the reset token from the request URL for a secure comparison with the hashed token in the database.
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  // 2. Retrieve the user whose hashed reset token matches the provided one and ensure the token hasn't expired.
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }, // Ensure the reset token's expiration time is still in the future.
  });

  if (!user) {
    return next(new AppError("Token is invalid or has expired.", 400));
  }

  // 3. Update the user's password with the new password from the request body, and clear out the reset token and its expiration.
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  // 4. Record the time of the password change.
  user.passwordChangedAt = Date.now();

  // 5. Persist the user's updated data to the database. This will include the new password and removal of the reset token.
  await user.save();

  // 6. Directly authenticate the user after a successful password reset, sending back a JWT token as a response.
  createSendToken(user, 200, req, res);
});

// Function to update a user's password
exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1. Get the user from the collection.
  const user = await User.findById(req.user.id).select("+password");

  // 2. Check if the current password is correct.
  if (!(await user.comparePassword(req.body.currentPassword, user.password))) {
    return next(new AppError("Incorrect password.", 401));
  }

  // 3. Validate that new password and confirmation are provided and that they match.
  if (!req.body.password || !req.body.passwordConfirm) {
    return next(
      new AppError(
        "Please provide both new password and password confirmation.",
        400
      )
    );
  }
  if (req.body.password !== req.body.passwordConfirm) {
    return next(
      new AppError("Password and password confirmation do not match.", 400)
    );
  }

  // 4. If the password is correct, update the password.
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;

  // 5. Record the time of the password change.
  user.passwordChangedAt = Date.now();

  // 6. Persist the user's updated data to the database.
  await user.save();

  // 7. Directly authenticate the user after a successful password update, sending back a JWT token as a response.
  createSendToken(user, 200, req, res);
});

// Function to protect routes from unauthenticated users
exports.protect = catchAsync(async (req, res, next) => {
  // 1. Check if the request contains the token in its cookies.
  const token = req.cookies.jwt;

  // 2. If no token is found, send back an error response.
  if (!token) {
    return next(
      new AppError(
        "You are not logged in. Please log in to access this route.",
        401
      )
    );
  }

  let decodedPayload;
  try {
    // 3. Verify the token to ensure it's valid.
    decodedPayload = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  } catch (error) {
    console.error("Token verification failed:", error.message);
    return next(new AppError("Invalid token. Please log in again.", 401));
  }

  // 4. Check if the user for which the token was issued still exists.
  const currentUser = await User.findById(decodedPayload.id);

  if (!currentUser) {
    return next(
      new AppError("The user associated with this token no longer exists.", 401)
    );
  }

  // 5. Check if user changed password after the token was issued.
  if (currentUser.changedPasswordAfter(decodedPayload.iat)) {
    console.warn("User recently changed password.");
    return next(
      new AppError("User recently changed password. Please log in again.", 401)
    );
  }

  if (
    !currentUser.profileCompleted &&
    req.originalUrl !== "/api/v1/users/createProfile"
  ) {
    return next(
      new AppError(
        "Please complete your profile before accessing this resource.",
        403
      )
    );
  }

  // 6. Grant access to the protected route.
  req.user = currentUser;
  next();
});

// Middleware to restrict access to certain routes based on user role
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // Check if the user's role is included in the provided roles.
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError("You do not have permission to perform this action.", 403)
      );
    }

    // If the user's role is included, grant access to the protected route.
    next();
  };
};
