/** Express controller providing album model
 * @module controllers/album
 * @requires express
 */

/**
 * express module
 * @const
 */
const mongoose = require('mongoose')

/**
 * Album schema
 * @type {object}
 * @const
 */
const albumSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true,'An album must have a name'],
    unique: true
  },
  href:{
    type: String,
    //required: [true,'An Album must have a ref']
  },
  images: {
    type: [String],
    //required: [true, 'An album must have at least one image']
  },
  albumType:{
    type: String,
    required: [true, 'An Album must have a type']
  },
  externalUrls: {
    description: 'an external URL object  Known external URLs for this album',
    type: [String]
  },
  type: {
    description: 'The object type  “album”',
    type: String
  },
  uri: {
    type: String,
    description: 'The Spotify URI for the album.'
    //required: [true,'An album must have a uri']
  },
  genre: {
    description: 'An array of strings. A list of the genres used to classify the album.',
    type: [String],
    required: [true,'An album must have at least one genre']
  },
  label: {
    description: 'The label for the album.',
    type: String
  },
  popularity: {
    description: 'The popularity of the album. The value will be equal to the sum of the likes of the album’s individual tracks.',
    type: Number,
	  default:0
  },
  copyrights: {
    description: 'Array of copyrights objects. The copyright statements of the album.',
    type: [String]
  },
  releaseDate: {
    description: 'The date the album was first released, for example 1981. Depending on the precision, it might be shown as 1981-12 or 1981-12-15.',
    type: Date,
    default: Date.now()
  },
  artists: [
    {
      type: mongoose.Schema.ObjectId,
      ref: 'user'
    }
  ],
  totalTracks: {
    description: 'The total number of tracks inside the album',
    type: Number ,
    required:[true, 'An Album must include the total number of']
  }
})

// /**
// * Populating the artist object
// * @function
// * @memberof module:models/albumModel
// * @inner
// * @param {string} find - populate the database before any find function
// */
// albumSchema.pre(/^find/, function (next) {
//   this.populate({
//     path: 'artists',
//     select: '_id name uri href externalUrls images type followers userStats userArtist'   // user public data

//   })

//   next()
// })

const Album = mongoose.model('Album', albumSchema)

module.exports = Album
