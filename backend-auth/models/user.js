const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true, 
    lowercase: true 
  },
  password: { 
    type: String, 
    required: true 
  },
  termsAccepted: {      
    type: Boolean,
    required: true,
    default: false
  },
  favoriteMovies: [{
    movieId: Number,
    tmdbId: Number,
    title: String,
    genres: String,
  }],
  favoriteBooks: [{
    isbn: String,
    title: String,
    authors: String,
  }],
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
});

module.exports = mongoose.model('User', userSchema);
