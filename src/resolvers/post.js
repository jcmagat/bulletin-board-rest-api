const Post = require("../models/Post");
const { setPostedSince } = require("../helpers/post");

/* Query Resolvers */
exports.getAllPosts = async () => {
  const posts = await Post.find();
  posts.forEach(setPostedSince);
  return posts;
};

exports.getPostById = async (parent, args) => {
  const post = await Post.findById(args.id);
  return post;
};

/* Mutation Resolvers */
exports.addPost = async (parent, args, { req, res }) => {
  if (!req.isAuth) {
    throw new Error("Not authenticated");
  }

  const post = await Post.create({
    title: args.title,
    message: args.message,
    postedOn: Date.now(),
    postedBy: req.user.username,
  });
  post.postedSince = "just now";
  return post;
};

exports.deletePost = async (parent, args, { req, res }) => {
  if (!req.isAuth) {
    throw new Error("Not authenticated");
  }

  const post = await Post.findById(args.id);
  if (post.postedBy !== req.user.username) {
    throw new Error("User not authorized to delete this post");
  }

  const deletedPost = await Post.findByIdAndDelete(args.id);
  return deletedPost;
};

exports.likePost = async (parent, args) => {
  const post = await Post.findByIdAndUpdate(
    args.id,
    { $inc: { likes: 1 } },
    { new: true, useFindAndModify: false }
  );
  return post;
};
