const { gql } = require("apollo-server-express");

module.exports = gql`
  type Post {
    _id: ID!
    content: String
    image: Image
    postedBy: User
  }

  type Subscription {
    postAdded: Post
    postUpdated: Post
    postDeleted: Post
  }
  #Query
  type Query {
    totalPosts: Int!
    allPosts(page: Int): [Post!]!
    postByUser: [Post!]!
    singlePost(postId: String!): Post!
    search(query: String): [Post]
  }
  # mutations
  type Mutation {
    postCreate(input: PostCreateInput!): Post!
    postUpdate(input: PostUpdateInput!): Post!
    postDelete(postId: String!): Post!
  }

  # input type
  input PostCreateInput {
    content: String
    image: ImageInput
  }
  input PostUpdateInput {
    _id: String!
    content: String
    image: ImageInput
  }
`;
