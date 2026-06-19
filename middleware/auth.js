const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
  // Read token from Authorization Header: "Bearer <Token>"
  const authHeader = req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ message: "Access Denied. Missing or malformed Auth Token" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    // Attach the user identity payload directly to request context
    req.user = verified;
    next();
  } catch (error) {
    res.status(400).json({ message: "Invalid or Expired Security Token" });
  }
};
