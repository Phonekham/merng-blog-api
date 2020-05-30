const { authCheck } = require("../helpers/auth");
const User = require("../models/user");
const Post = require("../models/post");

// Subscription
const POST_ADDED = "POST_ADDED";
const POST_UPDATED = "POST_UPDATED";
const POST_DELETED = "POST_DELETED";

// queries
const allPosts = async (parent, args, { req }) => {
  const currentPage = args.page || 1;
  const perPage = 3;

  return await Post.find({})
    .skip((currentPage - 1) * perPage)
    .limit(perPage)
    .populate("postedBy", "username _id")
    .sort({ createdAt: -1 })
    .exec();
};
const postByUser = async (parent, args, { req }) => {
  const currentUser = await authCheck(req);
  const currentUserFromDB = await User.findOne({
    email: currentUser.email,
  }).exec();
  return await Post.find({ postedBy: currentUserFromDB })
    .populate("postedBy", "_id username")
    .sort({ createdAt: -1 });
};

const singlePost = async (parent, args, { req }) => {
  return await Post.findById({ _id: args.postId })
    .populate("postedBy", "_id username")
    .exec();
};

const totalPosts = async (parent, args) =>
  await Post.find({}).estimatedDocumentCount().exec();

const search = async (parent, args) => {
  const { query } = args;
  return await Post.find({ $text: { $search: query } })
    .populate("postedBy", "username")
    .exec();
};

// mutation
const postCreate = async (parent, args, { req, pubsub }) => {
  const currentUser = await authCheck(req);

  // validate
  if (args.input.content.trim() === "") throw new Error("content is required");

  const currentUserFromDB = await User.findOne({
    email: currentUser.email,
  });
  let newPost = await new Post({
    ...args.input,
    postedBy: currentUserFromDB._id,
  })
    .save()
    .then((post) => post.populate("postedBy", "_id username").execPopulate());

  pubsub.publish(POST_ADDED, { postAdded: newPost });

  return newPost;
};

const postUpdate = async (parent, args, { req, pubsub }) => {
  const currentUser = await authCheck(req);
  // validation
  if (args.input.content.trim() === "") throw new Error("Content is required");
  // get current user from db
  const currentUserFromDB = await User.findOne({
    email: currentUser.email,
  }).exec();
  // id of post to update
  const postToUpdate = await Post.findById({ _id: args.input._id }).exec();
  if (currentUserFromDB._id.toString() !== postToUpdate.postedBy._id.toString())
    throw new Error("not authorized");
  const updatedPost = await Post.findByIdAndUpdate(
    args.input._id,
    { ...args.input },
    { new: true }
  )
    .exec()
    .then((post) => post.populate("postedBy", "_id username").execPopulate());

  pubsub.publish(POST_UPDATED, { postUpdated: updatedPost });

  return updatedPost;
};

const postDelete = async (parent, args, { req, pubsub }) => {
  const currentUser = await authCheck(req);
  const currentUserFromDB = await User.findOne({
    email: currentUser.email,
  }).exec();
  const postToDelete = await Post.findById({ _id: args.postId }).exec();
  if (currentUserFromDB._id.toString() !== postToDelete.postedBy._id.toString())
    throw new Error("not authorized");
  const deletedPost = await Post.findByIdAndDelete({ _id: args.postId })
    .exec()
    .then((post) => post.populate("postedBy", "_id username").execPopulate());

  pubsub.publish(POST_DELETED, { postDeleted: deletedPost });

  return deletedPost;
};

module.exports = {
  Query: { allPosts, postByUser, singlePost, totalPosts, search },
  Mutation: {
    postCreate,
    postUpdate,
    postDelete,
  },
  Subscription: {
    postAdded: {
      subscribe: (parent, args, { pubsub }) =>
        pubsub.asyncIterator([POST_ADDED]),
    },
    postUpdated: {
      subscribe: (parent, args, { pubsub }) =>
        pubsub.asyncIterator([POST_UPDATED]),
    },
    postDeleted: {
      subscribe: (parent, args, { pubsub }) =>
        pubsub.asyncIterator([POST_DELETED]),
    },
  },
};
