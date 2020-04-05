/**
 * Controller module.
 * @module controllers
 * @requires express
 */

/**
 * Track controller to call when routing.
 * @type {object}
 * @const
 * @module controllers
 * @namespace trackController
 */

/**
 * express module
 * Track model from the database
 * @const
 */
const Track = require('./../models/trackModel')
/**
 * express module
 * Player services
 * @const
 */
const playerServices = require('../services/playerService')
const playerService = new playerServices()

/**
 * express module
 * AppError class file
 * @const
 */
const AppError = require('./../utils/appError')

/**
 * express module
 * API features utils file
 * @const
 */
const APIFeatures = require('./../utils/apiFeatures')

/**
 * express module
 * catchAsync utils file
 * @const
 */
const catchAsync = require('./../utils/catchAsync')


/**
 * Get one Track given its ID
 * @memberof module:controllers~trackController
 * @function getOneTrack
 * @param {Request}  - The function takes the request as a parameter to access its body.
 * @param {Respond} - The respond sent
 * @param {next} - The next function in the middleware
 * @return {JSON} The details of the track in a json form.
 */
exports.getOneTrack = catchAsync(async (req, res, next) => {

  const features = new APIFeatures(Track.findById(req.params.trackId), req.query).limitFieldsTracks()
  const track = await features.query
  console.error("Inside track")

  res.status(200).json({
    status: 'success',
    data: {
     track
    }
  })
})

/**
 * Get a list of Tracks given their ID
 * @memberof module:controllers~trackController
 * @function getTracks
 * @param {Request}  - The function takes the request as a parameter to access its body.
 * @param {Respond} - The respond sent
 * @param {next} - The next function in the middleware
 * @return {JSON} The details of the tracks in a json form.
 */
exports.getTracks = catchAsync(async (req, res, next) => { //    if we have href for tracks in playlist but basicly can work for anything
  const ids = req.query._id.split(',')
  const features = new APIFeatures(Track.find().where('_id').in(ids), req.query).limitFieldsTracks()
  const tracks = await features.query

  if(tracks.length===0){
    return next(new AppError('No tracks found with those ID', 404))
  }

  res.status(200).json({
    status: 'success',
    data: {
     tracks
    }
  })
})


/**
 * Get one Track mp3 file given its ID
 * @memberof module:controllers/track~trackController
 * @param {Request}  - The function takes the request as a parameter to access its body.
 * @param {Respond} - The respond sent
 * @param {next} - The next function in the middleware
 * @return {File} The mp3 file of the track.
 */
exports.getOneTrackAudioFile = catchAsync(async (req, res, next) => {
  const track = await Track.findById(req.params.trackId)
  console.log(track)
  //Check authorization first
  const authorized = await playerService.validateTrack(req.headers.authorization)
  if(authorized){  //Send file if authorize
  res.download(track.audioFilePath)
  }
  else {
    res.status(403).send();
  }
})

//module.exports=exports.getOneTrack(req,res,next)