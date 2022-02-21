const pool = require("../database");
const { uploadFile, deleteFile } = require("../services/s3");
const {
  ApolloError,
  AuthenticationError,
  ForbiddenError,
  UserInputError,
} = require("apollo-server-express");

/* ========== Query Resolvers ========== */

exports.getUser = async (parent, args) => {
  try {
    const username = args.username;

    const query = await pool.query(
      `SELECT user_id, username, created_at, profile_pic_src 
      FROM users 
      WHERE username = ($1)`,
      [username]
    );

    const user = query.rows[0];

    return user;
  } catch (error) {
    throw new ApolloError(error);
  }
};

exports.getAuthUser = async (parent, args, { req, res }) => {
  if (!req.isAuth) {
    throw new AuthenticationError("Not authenticated");
  }

  try {
    const user_id = req.user.user_id;

    const query = await pool.query(
      `SELECT user_id, email, username, created_at, profile_pic_src 
      FROM users 
      WHERE user_id = ($1)`,
      [user_id]
    );

    const user = query.rows[0];

    return user;
  } catch (error) {
    throw new ApolloError(error);
  }
};

// Child resolver for User to get following
exports.getFollowing = async (parent, args) => {
  try {
    const user_id = parent.user_id;

    const query = await pool.query(
      `SELECT username, followed_at 
      FROM follows
        INNER JOIN users
        ON (followed_id = user_id)
      WHERE follower_id = ($1)`,
      [user_id]
    );

    const following = query.rows;

    return following;
  } catch (error) {
    throw new ApolloError(error);
  }
};

// Child resolver for User to get followers
exports.getFollowers = async (parent, args) => {
  try {
    const user_id = parent.user_id;

    const query = await pool.query(
      `SELECT username, followed_at 
      FROM follows
        INNER JOIN users
        ON (follower_id = user_id)
      WHERE followed_id = ($1)`,
      [user_id]
    );

    const followers = query.rows;

    return followers;
  } catch (error) {
    throw new ApolloError(error);
  }
};

// Child resolver for User to get user's posts
exports.getUserPosts = async (parent, args) => {
  try {
    const user_id = parent.user_id;

    const query = await pool.query(
      `SELECT type, post_id, title, description, media_src, created_at, 
        user_id, community_id, age(now(), created_at) 
      FROM posts 
      WHERE user_id = ($1)`,
      [user_id]
    );

    const posts = query.rows;

    return posts;
  } catch (error) {
    throw new ApolloError(error);
  }
};

// Child resolver for User to get authenticated user's comments
exports.getUserComments = async (parent, args, { req, res }) => {
  if (!req.isAuth) {
    throw new AuthenticationError("Not authenticated");
  }

  if (parent.user_id !== req.user.user_id) {
    throw new ForbiddenError("User not authorized");
  }

  try {
    const user_id = req.user.user_id;

    const query = await pool.query(
      `SELECT comment_id, parent_comment_id, post_id, user_id, message, 
        age(now(), created_at) 
      FROM comments 
      WHERE user_id = ($1)`,
      [user_id]
    );

    const comments = query.rows;

    return comments;
  } catch (error) {
    throw new ApolloError(error);
  }
};

// Child resolver for User to get authenticated user's saved posts
exports.getSavedPosts = async (parent, args, { req, res }) => {
  if (!req.isAuth) {
    throw new AuthenticationError("Not authenticated");
  }

  if (parent.user_id !== req.user.user_id) {
    throw new ForbiddenError("User not authorized");
  }

  try {
    const user_id = req.user.user_id;

    const query = await pool.query(
      `SELECT type, post_id, title, description, media_src, created_at, 
        user_id, community_id, age(now(), created_at) 
      FROM posts 
      WHERE post_id IN (
        SELECT post_id 
        FROM saved_posts 
        WHERE user_id = ($1)
      )`,
      [user_id]
    );

    const savedPosts = query.rows;

    return savedPosts;
  } catch (error) {
    throw new ApolloError(error);
  }
};

/* ========== Mutation Resolvers ========== */

exports.follow = async (parent, args, { req, res }) => {
  if (!req.isAuth) {
    throw new AuthenticationError("Not authenticated");
  }

  try {
    const follower_id = req.user.user_id;
    const followed_username = args.username;

    const query = await pool.query(
      `WITH x AS (
      INSERT INTO follows (follower_id, followed_id) 
        SELECT ($1), user_id 
        FROM users 
        WHERE username = ($2)
      ON CONFLICT ON CONSTRAINT follows_pkey 
      DO NOTHING
      )
      SELECT user_id, username, created_at, profile_pic_src 
      FROM users 
      WHERE username = ($2)`,
      [follower_id, followed_username]
    );

    const followedUser = query.rows[0];

    return followedUser;
  } catch (error) {
    throw new ApolloError(error);
  }
};

exports.unfollow = async (parent, args, { req, res }) => {
  if (!req.isAuth) {
    throw new AuthenticationError("Not authenticated");
  }

  try {
    const follower_id = req.user.user_id;
    const followed_username = args.username;

    const query = await pool.query(
      `WITH x AS (
      DELETE FROM follows
      WHERE follower_id = ($1) AND followed_id IN (
        SELECT user_id
        FROM users 
        WHERE username = ($2)
      ))
      SELECT user_id, username, created_at, profile_pic_src 
      FROM users 
      WHERE username = ($2)`,
      [follower_id, followed_username]
    );

    const unfollowedUser = query.rows[0];

    return unfollowedUser;
  } catch (error) {
    throw new ApolloError(error);
  }
};

exports.removeFollower = async (parent, args, { req, res }) => {
  if (!req.isAuth) {
    throw new AuthenticationError("Not authenticated");
  }

  try {
    const followed_id = req.user.user_id;
    const follower_username = args.username;

    const query = await pool.query(
      `WITH x AS (
      DELETE FROM follows
      WHERE followed_id = ($1) AND follower_id IN (
        SELECT user_id
        FROM users 
        WHERE username = ($2)
      ))
      SELECT user_id, username, created_at, profile_pic_src 
      FROM users 
      WHERE username = ($2)`,
      [followed_id, follower_username]
    );

    const removedFollower = query.rows[0];

    return removedFollower;
  } catch (error) {
    throw new ApolloError(error);
  }
};

exports.changeUsername = async (parent, args, { req, res }) => {
  if (!req.isAuth) {
    throw new AuthenticationError("Not authenticated");
  }

  try {
    const username = args.username;
    const user_id = req.user.user_id;

    const query = await pool.query(
      `UPDATE users 
      SET username = ($1) 
      WHERE user_id = ($2) 
      RETURNING user_id, username, created_at, profile_pic_src`,
      [username, user_id]
    );

    const user = query.rows[0];

    return user;
  } catch (error) {
    if (error.constraint === "users_username_key") {
      throw new UserInputError("Username is already taken");
    } else {
      throw new ApolloError(error);
    }
  }
};

exports.changeProfilePic = async (parent, args, { req, res }) => {
  if (!req.isAuth) {
    throw new AuthenticationError("Not authenticated");
  }

  try {
    const user_id = req.user.user_id;

    const uploadedFile = await uploadFile(args.profile_pic);
    const profile_pic_src = `/media/${uploadedFile.Key}`;

    const query = await pool.query(
      `UPDATE users 
      SET profile_pic_src = ($1) 
      WHERE user_id = ($2) 
      RETURNING user_id, username, created_at, profile_pic_src, (
          SELECT profile_pic_src 
          FROM users 
          WHERE user_id = ($2)
        ) 
        AS old_profile_pic_src`,
      [profile_pic_src, user_id]
    );

    const user = query.rows[0];

    if (user.old_profile_pic_src) {
      const key = user.old_profile_pic_src.split("/")[2];
      await deleteFile(key);
    }

    return user;
  } catch (error) {
    throw new ApolloError(error);
  }
};
