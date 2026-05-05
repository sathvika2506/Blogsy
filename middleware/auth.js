// Middleware to check if user is authenticated
export function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  res.redirect("/login?error=Please log in to continue");
}

// Middleware to check if user is admin
export function requireAdmin(req, res, next) {
  if (req.session && req.session.userId && req.session.role === "admin") {
    return next();
  }
  res.status(403).render("error", { message: "Access denied." });
}

// Middleware to attach user info to all views
export function attachUser(req, res, next) {
  res.locals.currentUser = req.session.user || null;
  res.locals.isAdmin = req.session.role === "admin";
  next();
}
