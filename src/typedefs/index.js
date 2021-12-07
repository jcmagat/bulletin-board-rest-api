const { gql } = require("apollo-server-express");

const typeDefs = gql`
  type Register {
    registered: Boolean!
  }

  type AuthData {
    user_id: Int!
    accessToken: String!
    refreshToken: String!
    accessTokenExpiration: String!
    refreshTokenExpiration: String!
  }

  type Post {
    post_id: Int!
    title: String!
    description: String!
    user_id: Int!
    username: String
    created_since: String
    reactions: PostReactions
  }

  type PostReactions {
    likes: Int!
    dislikes: Int!
    total: Int!
    auth_user_reaction: String
  }

  type PostReaction {
    post_id: Int!
    username: String!
    reaction: String!
  }

  type Comment {
    comment_id: Int!
    parent_comment_id: Int
    post_id: Int!
    username: String!
    message: String!
    created_since: String!
  }

  # Queries
  type Query {
    posts: [Post]
    post(post_id: Int!): Post
    comments(post_id: Int!): [Comment]
  }

  # Mutations
  type Mutation {
    # Auth mutations
    register(email: String!, username: String!, password: String!): Register
    login(username: String!, password: String!): AuthData

    # Post mutations
    addPost(title: String!, description: String!): Post
    deletePost(post_id: Int!): Post
    addPostReaction(post_id: Int!, reaction: String!): PostReaction
    deletePostReaction(post_id: Int!): PostReaction
    addComment(parent_comment_id: Int, post_id: Int!, message: String!): Comment
  }
`;

module.exports = typeDefs;
