// /** Express service for music player
//  * @module services/player
//  * @requires express
//  */

/**
 * User model from the database
 * @const
 */
const User = require('../models/userModel')

/*
* Context model from the database
* @const
*/
const Context = require('../models/contextModel')

/**
 * Play History model from the database
 * @const
 */
const PlayHistory = require('../models/playHistoryModel')

/*
* Playlist model from the database
* @const
*/
const Playlist = require('../models/playlistModel')

/*
* Album model from the database
* @const
*/
const Album = require('../models/albumModel')

/**
 *
 * Player model from the database
 * @const
 */
const Player = require('../models/playerModel')

/**
 *
 * App error util
 * @const
 */
const AppError = require('../utils/appError')

/**
 * User services class
 * @const
 */
const UserServices = require('./userService')

const userService = new UserServices()

/**
 * Class reprensenting the player services needed to handle the music player
 */
class playerService {
  // Constructor with dependency injection
  /**
    * Constructs the player service
    * @param {*} userService
    */
  constructor(userService) {
    this.userService = userService
  }

  /**
    * Checks if track requested can be played by user or not
    * @function
    * @param {String} authToken - The authorization token of the user.
    */
  async validateTrack(authToken) {
    const userId = await userService.getUserId(authToken)
    const userRole = await userService.getUserRole(authToken)
    return true // TODO: Instead of returning true, compare with the current queue for this user if was free member.
  }

  /**
     *
    * Generates the context for the song playing at the moment of sending the request.
    * @function
    * @param {String} uri - The uri of played conext.
    * @param {String} type - The type of played context.
    * @param {String} userId - The Id of the user.
    */
  async generateContext(uri, type, userId) {
    const user = User.findById(userId)
    //Create the queue of tracks
    let queueTracksUris, tracks
    //Create the context for the user    
    const newContext = new Context()
    newContext.uri = uri
    newContext.type = type
    if (type === 'playlist') {
      const contextPlaylist = await Playlist.findOne({ uri: uri })
      if (!contextPlaylist) return null
      newContext.externalUrls = contextPlaylist.external_urls
      newContext.href = contextPlaylist.href
      newContext.name = contextPlaylist.name
      newContext.images = contextPlaylist.images
      newContext.followersCount = contextPlaylist.popularity
      tracks = await contextPlaylist.trackObjects
      queueTracksUris = array.map(tracks => tracks.uri)
    } else if (type === 'album') {
      const contextAlbum = await Album.findOne({ uri: uri })
      if (!contextAlbum) return null
      newContext.externalUrls = contextAlbum.externalUrls
      newContext.href = contextAlbum.href
      newContext.name = contextAlbum.name
      newContext.images = contextAlbum.images
      newContext.followersCount = contextAlbum.popularity
      tracks = await contextAlbum.trackObjects
      queueTracksUris = array.map(tracks => tracks.uri)
    } else if (type === 'artist') {
      const contextArtist = await User.findOne({ uri: uri })
      if (contextArtist == null) return null
      newContext.externalUrls = contextArtist.externalUrls
      newContext.href = contextArtist.href
      newContext.name = contextArtist.name
      newContext.images = contextArtist.images
      newContext.followersCount = contextArtist.followers.length
      tracks = await contextArtist.trackObjects
      queueTracksUris = array.map(tracks => tracks.uri)
    }
    user.context = newContext
    
    //Get user player and update the queue with shuffled list
    const userPlayer = await Player.findOne({'userId':userId})
    userPlayer.queueTracksUris = queueTracksUris
    this.shufflePlayerQueue(userId)
  }

  /**
    * Gets the context for the passed user.
    * @function
    * @inner
    * @param {String} userId - The ID of the user.
    */
  async getContext(userId) {
    const context = await Player.find({ userId: userId }).select('context')
    return context
  }

  /**
    * Checks if the user with this token has reached the maximum number of recently played items and if so deletes one recently played item.
    * @function
    * @param {String} userId  - The ID of the user.
    */
  async deleteOneRecentlyPlayedIfFull(userId) {
    const count = await PlayHistory.countDocuments({ userId: userId })
    if (count >= parseInt(process.env.PLAY_HISTORY_MAX_COUNT, 10)) { // If we reached the limit of playHistory for this user
      const oldestPlayHistory = await PlayHistory
        .find()
        .where('userId').equals(userId)
        .sort('playedAt')
        .limit(1)
      await PlayHistory.findByIdAndDelete(oldestPlayHistory[0]._id)
    }
  }

  /**
  * Shuffles the queue of songs for the player.
  * @function
  * @param {String} userId  - The ID of the user.
  */
  async shufflePlayerQueue(userId) {
    const userPlayer = await Player.findOne({ 'userId': userId })
    const userQueue = await userPlayer.queueTracksUris
    //Using Fisher-Yates shuffling algorithm, shuffle the queue.
    let i, j, x
    for (i = userQueue.length - 1; i > 0; i--) {
      j = Math.floor(Math.random() * (i + 1))
      x = userQueue[i]
      userQueue[i] = userQueue[j]
      userQueue[j] = x
    }
    userPlayer.queueTracksUris = userQueue
    await Player.updateOne({ 'userId': userId }, { $set: { 'queueTracksUris': userQueue } })
  }

}

module.exports = playerService
