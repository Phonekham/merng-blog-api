const express = require("express");
const { ApolloServer, PubSub } = require("apollo-server-express");
const http = require("http");
const path = require("path");
const mongoose = require("mongoose");
const {
  fileLoader,
  mergeTypes,
  mergeResolvers,
} = require("merge-graphql-schemas");
const cors = require("cors");
const bodyParser = require("body-parser");
const cloudinary = require("cloudinary");

const pubsub = new PubSub();

const { authCheckMiddleware } = require("./helpers/auth");

require("dotenv").config();

const app = express();

// db
const db = async () => {
  try {
    const success = await mongoose.connect(process.env.DATABASE, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
      useFindAndModify: false,
    });
    console.log("DB Connected");
  } catch (error) {
    console.log("DB Connection Error", error);
  }
};
// execute database connection
db();

// Middlewares
app.use(cors());
app.use(bodyParser.json({ limit: "5mb" }));

// typeDefs
const typeDefs = mergeTypes(fileLoader(path.join(__dirname, "./typeDefs")));
// resolvers
const resolvers = mergeResolvers(
  fileLoader(path.join(__dirname, "./resolvers"))
);

// graphql server
const apolloServer = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => ({ req, pubsub }),
});

// applyMiddleware method connects ApolloServer to a specific HTTP framework ie: express

apolloServer.applyMiddleware({ app });

// server
const httpserver = http.createServer(app);
apolloServer.installSubscriptionHandlers(httpserver);

// Rest Endpoint

// cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// upload image
app.post("/uploadimages", authCheckMiddleware, (req, res) => {
  cloudinary.uploader.upload(
    req.body.image,
    (result) => {
      // console.log(result);
      res.send({
        url: result.url,
        public_id: result.public_id,
      });
    },
    {
      public_id: `${Date.now()}`,
      resource_type: "auto",
    }
  );
});

// remove image
app.post("/removeimage", authCheckMiddleware, (req, res) => {
  let image_id = req.body.public_id;
  cloudinary.uploader.destroy(image_id, (error, result) => {
    if (error) return res.json({ success: false, error });
    res.send("ok");
  });
});

httpserver.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
  console.log(
    `graphql server is ready at http://localhost:${process.env.PORT}${apolloServer.graphqlPath}`
  );
  console.log(`Subscription is ready at ${apolloServer.subscriptionsPath}`);
});
