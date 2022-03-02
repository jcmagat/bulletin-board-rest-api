const pool = require("../database");
const { ApolloError, AuthenticationError } = require("apollo-server-express");

/* ========== Query Resolvers ========== */

exports.getAllCommunities = async (parent, args) => {
  try {
    const query = await pool.query(
      `SELECT community_id, name, title, description, created_at 
      FROM communities`
    );

    const communities = query.rows;

    return communities;
  } catch (error) {
    throw new ApolloError(error);
  }
};

exports.getCommunity = async (parent, args) => {
  try {
    const name = args.name;

    const query = await pool.query(
      `SELECT community_id, name, title, description, created_at 
      FROM communities 
      WHERE name = ($1)`,
      [name]
    );

    const community = query.rows[0];

    return community;
  } catch (error) {
    throw new ApolloError(error);
  }
};

// Child resolver for Community to get community's moderators
exports.getCommunityModerators = async (parent, args) => {
  try {
    const community_id = parent.community_id;

    const query = await pool.query(
      `SELECT user_id, username, created_at, profile_pic_src 
      FROM users 
      WHERE user_id IN (
        SELECT user_id 
        FROM moderators 
        WHERE community_id = ($1)
      )`,
      [community_id]
    );

    const moderators = query.rows;

    return moderators;
  } catch (error) {
    throw new ApolloError(error);
  }
};

// Child resolver for Community to get community's members
exports.getCommunityMembers = async (parent, args) => {
  try {
    const community_id = parent.community_id;

    const query = await pool.query(
      `SELECT user_id, username, created_at, profile_pic_src 
      FROM users 
      WHERE user_id IN (
        SELECT user_id 
        FROM members 
        WHERE community_id = ($1)
      )`,
      [community_id]
    );

    const members = query.rows;

    return members;
  } catch (error) {
    throw new ApolloError(error);
  }
};

// Child resolver for Community to get community's posts
exports.getCommunityPosts = async (parent, args) => {
  try {
    const community_id = parent.community_id;

    const query = await pool.query(
      `SELECT type, post_id, title, description, media_src, created_at, 
        user_id, community_id, age(now(), created_at) 
      FROM posts 
      WHERE community_id = ($1)`,
      [community_id]
    );

    const posts = query.rows;

    return posts;
  } catch (error) {
    throw new ApolloError(error);
  }
};

/* ========== Mutation Resolvers ========== */

exports.join = async (parent, args, { req, res }) => {
  if (!req.isAuth) {
    throw new AuthenticationError("Not authenticated");
  }

  try {
    const community_id = args.community_id;
    const user_id = req.user.user_id;

    const query = await pool.query(
      `WITH x AS (
        INSERT INTO members (community_id, user_id) 
        VALUES ($1, $2) 
        ON CONFLICT ON CONSTRAINT members_pkey 
        DO NOTHING
      )
      SELECT community_id, name, title, description, created_at 
      FROM communities 
      WHERE community_id = ($1)`,
      [community_id, user_id]
    );

    const community = query.rows[0];

    return community;
  } catch (error) {
    throw new ApolloError(error);
  }
};

exports.leave = async (parent, args, { req, res }) => {
  if (!req.isAuth) {
    throw new AuthenticationError("Not authenticated");
  }

  try {
    const community_id = args.community_id;
    const user_id = req.user.user_id;

    const query = await pool.query(
      `WITH x AS (
        DELETE FROM members 
        WHERE community_id = ($1) AND user_id = ($2)
      )
      SELECT community_id, name, title, description, created_at 
      FROM communities 
      WHERE community_id = ($1)`,
      [community_id, user_id]
    );

    const community = query.rows[0];

    return community;
  } catch (error) {
    throw new ApolloError(error);
  }
};
