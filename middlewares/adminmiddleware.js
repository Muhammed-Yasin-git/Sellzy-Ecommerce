// adminmiddleware.js

exports.authenticateMiddleware = (req, res, next) => {
  if (req.session.adminAuthenticated) {
    return next();
  }
  res.redirect("/admin-login");
};

exports.checkNotAuthenticateAdmin = (req, res, next) => {
  if (req.session.adminAuthenticated) {
    res.redirect("/admin-dash");
  } else {
    next();
  }
};
