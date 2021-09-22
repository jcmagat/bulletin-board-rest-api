const mongoose = require("mongoose");

const PostSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  postedOn: {
    type: Date,
    required: true,
  },
  postedBy: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model("Post", PostSchema);
