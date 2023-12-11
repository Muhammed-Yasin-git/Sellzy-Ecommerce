exports.userCheckMiddleware = (req, res, next) => {
    if (req.session.userAuthenticated) {
        return next();
    }
    res.redirect("/signin");
  };
  
  exports.checkNotAuthenticateuser = (req, res, next) => {
    if (req.session.userAuthenticated) {
        res.redirect("/");
    } else {
        next();
    }
  };