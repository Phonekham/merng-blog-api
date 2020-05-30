var admin = require("firebase-admin");
var serviceAccount = require("../config/fbServiceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  //   databaseURL: "https://merng-blog.firebaseio.com",
});

exports.authCheck = async (req) => {
  try {
    const currentUser = await admin.auth().verifyIdToken(req.headers.authtoken);
    console.log("current user", currentUser);
    return currentUser;
  } catch (error) {
    console.log("auth check error", error);
    throw new Error("invalid or expired token");
  }
};

exports.authCheckMiddleware = (req, res, next) => {
  if (req.headers.authtoken) {
    admin
      .auth()
      .verifyIdToken(req.headers.authtoken)
      .then((result) => {
        next();
      })
      .catch((error) => console.log(error));
  } else {
    res.json({ error: "Unauthorized" });
  }
};
