/** Jest unit testing for becoming premium
 * @module routes/users
 * @requires express
 */

/**
 * sinon
 * @const
 */
const sinon = require('sinon')
/**
 * mocking requests
 * @const
 */
const httpMocks = require('node-mocks-http')

/**
 * dotenv for environment variables
 * @const
 */
const dotenv = require('dotenv')
// Configuring environment variables to use them
dotenv.config()

/**
 * mongoose for db management
 * @const
 */
const mongoose = require('mongoose')

/**
 * express module
 * jwt for tokens
 * @const
 */
const jwt = require('jsonwebtoken')

/**
 * express module
 * User model from the database
 * @const
 */
const User = require('../../../models/userModel')

/**
 * express module
 * User controller
 * @const
 */
const userController = require('../../../controllers/userController')

/**
 * express module
 * User middleware: Premium
 * @const
 */
const premiumMiddleware = require('../../../middleware/user/premium')

const mongoDB = process.env.DATABASE_LOCAL
// Connecting to the database
if (process.env.NODE_ENV === 'test') {
  mongoose.connect(mongoDB, { useNewUrlParser: true, useUnifiedTopology: true })
} else {
  throw new Error('Can\'t connect to db, make sure you run in test environment!' + process.env.NODE_ENV)
}

// Testing userController create token string function
describe('userController create token string functionality', () => {
  // Drop the whole users collection before testing and add a simple user to test with
  beforeEach(async () => {
    await mongoose.connection.collection('users').deleteMany({})

    // Creating the valid user to assign the token to him
    const validUser = new User({
      name: 'omar',
      email: 'omar@email.com',
      password: 'password'
    })
    await validUser.save()
  })

  // Drop the whole users collection after finishing testing
  afterAll(async () => {
    await mongoose.connection.collection('users').deleteMany({})
  })

  // Testing creating the token string without problems
  it('Should create the token string successfully', async (done) => {
    const request = httpMocks.createRequest({
      method: 'POST',
      url: '/me/premium'
    })

    const response = httpMocks.createResponse()
    premiumMiddleware.createTokenString(request, response, process.env.PREM_CONF_CODE_SIZE, (err, req, res, token) => {
      try {
        expect(err).not.toEqual(expect.anything())
        expect(token).toBeDefined()
        done()
      } catch (error) {
        done(error)
      }
    })
  })
})

// Testing assigning the config code for becoming premium to user
describe('userController assigning config code to user functionality', () => {
  // the authorization token needed to test
  var authToken = 'testToken'
  // Drop the whole users collection before testing and add a simple user to test with
  beforeEach(async () => {
    sinon.restore()
    await mongoose.connection.collection('users').deleteMany({})
    // Creating the valid user to assign the token to him
    const validUser = new User({
      name: 'omar',
      email: 'omar@email.com',
      password: 'password'
    })
    await validUser.save()
  })

  // Drop the whole users collection after finishing testing
  afterAll(async () => {
    sinon.restore()
    await mongoose.connection.collection('users').deleteMany({})
  })

  // Testing successfully assigning the config code to a user
  it('Should assign the confiramtion code to an existing user successfully', async (done) => {
    // get the id of the document in the db to use it to get authorization token
    await User.findOne({}, (err, user) => {
      const id = user._id
      authToken = jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE_IN })
    })
    const request = httpMocks.createRequest({
      method: 'POST',
      url: '/me/premium',
      headers: {
        authorization: 'Bearer '+authToken
      }
    })
    const response = httpMocks.createResponse()
    const code = 'atoken'
    premiumMiddleware.assignPremiumConfirmCode(request, response, code, (err, req, res, code, user) => {
      try {
        expect(err).not.toEqual(expect.anything())
        expect(user).toBeDefined()
        expect(user.becomePremiumToken).toEqual(code)
        done()
      } catch (error) {
        done(error)
      }
    })
  })
  // TODO: Testing assigning the config code to a non existent user
  // it('Shouldn\'t assign the code as it\'s an non-existent user', async (done) => {
  //   // Creating a fake string to use instead of ID in sign function
  //   const randomString = 'not a valid token'
  //   authToken = jwt.sign({ randomString }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE_IN })
  //   const request = httpMocks.createRequest({
  //     method: 'POST',
  //     url: '/me/premium',
  //     headers: {
  //       authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjVlNzRkOGZjMzY4NWM0NDBmMWNjYjg1ZiIsImlhdCI6MTU4NDcxNjAyOCwiZXhwIjoxNTg3MzA4MDI4fQ.Bi_HC9WLnRcniqiFNV1w9zApK0KvbFc1aHcHabTtFg0' //fake token
  //     }
  //   })
  //   const response = httpMocks.createResponse()
  //   const code = 'atoken'
  //   premiumMiddleware.assignPremiumConfirmCode(request, response, code, (err, req, res, code, user) => {
  //     try {
  //       expect(err).toEqual(expect.anything())
  //       expect(err.statusCode).toEqual(404)
  //       done()
  //     } catch (error) {
  //       done(error)
  //     }
  //   })
  // })

  // Testing getting an error when searching for user with auth token in db
  it('Should receive an error when not able to search the db', async (done) => {
    const request = httpMocks.createRequest({
      method: 'POST',
      url: '/me/premium',
      headers: {
        authorization: 'Bearer '+authToken
      }
    })
    const response = httpMocks.createResponse()
    const code = 'atoken'
    sinon.stub(User, 'findOne').yields(new Error('Couldn\'t search for user in db.'))
    premiumMiddleware.assignPremiumConfirmCode(request, response, code, (err, req, res, code, user) => {
      try {
        expect(err).toEqual(expect.anything())
        expect(err.statusCode).toEqual(500)
        done()
      } catch (error) {
        done(error)
      }
    })
  })

})

// Testing userController send premium confirmation code email
describe('userController send premium confirmation code mail functionality', () => {
  // the authorization token needed to test
  var authToken = 'testToken'
  // Drop the whole users collection before testing and add a simple user to test with
  beforeEach(async () => {
    sinon.restore()
    await mongoose.connection.collection('users').deleteMany({})

    // Creating the valid user to assign the token to him
    const validUser = new User({
      name: 'omar',
      email: 'omar@email.com',
      password: 'password'
    })
    await validUser.save()
  })

  // Drop the whole users collection after finishing testing
  afterAll(async () => {
    sinon.restore()
    await mongoose.connection.collection('users').deleteMany({})
  })

  // Testing sending the email with no problems
  it('Should send the email successfully', async (done) => {
    const request = httpMocks.createRequest({
      method: 'POST',
      url: '/me/premium',
      headers: {
        authorization: 'Bearer '+authToken
      }
    })

    const user = { email: 'omar@email.com' }
    const token = 'atoken'
    const response = httpMocks.createResponse()
    premiumMiddleware.sendPremiumConfirmCodeMail(request, response, token, user, (err) => {
      try {
        expect(err).not.toEqual(expect.anything())
        done()
      } catch (error) {
        done(error)
      }
    })
  })

  // Testing failing to send the email with no problems
  it('Shouldn\'t send the email successfully', async (done) => {
    const request = httpMocks.createRequest({
      method: 'POST',
      url: '/me/premium',
      headers: {
        authorization: 'Bearer '+authToken
      }
    })

    const transport = {
      sendMail: (data, callback) => {
        const err = new Error('Error with sendMail from transport!')
        callback(err, null)
      }
    }
    sinon.stub(userController.nodemailer, 'createTransport').returns(transport)
    const user = { email: 'omar@email.com' }
    const token = 'atoken'
    const response = httpMocks.createResponse()
    premiumMiddleware.sendPremiumConfirmCodeMail(request, response, token, user, (err) => {
      try {
        expect(err.statusCode).toEqual(502)
        done()
      } catch (error) {
        done(error)
      }
    })
  })
})


// Testing userController change user role after confirming premium code
describe('userController change user role after confirming premium code', () => {
  // the authorization token needed to test
  var authToken = 'testToken'
  // Drop the whole users collection before testing and add a simple user to test with
  beforeEach(async () => {
    sinon.restore()
    await mongoose.connection.collection('users').deleteMany({})

    // Creating the valid user to assign the token to him
    const validUser = new User({
      name: 'omar',
      email: 'omar@email.com',
      password: 'password',
      becomePremiumToken: 'atoken',
      becomePremiumExpires: Date.now() + 360000
    })
    await validUser.save()
  })

  // Drop the whole users collection after finishing testing
  afterAll(async () => {
    sinon.restore()
    await mongoose.connection.collection('users').deleteMany({})
  })

  // Testing changing the role with valid confirmation code
  it('Should change the role to premium successfully', async (done) => {
    // get the id of the document in the db to use it to get authorization token
    await User.findOne({}, (err, user) => {
      const id = user._id
      authToken = jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE_IN })
    })
    const request = httpMocks.createRequest({
      method: 'POST',
      url: '/me/premium/atoken',
      params: {
        confirmationCode: 'atoken'
      },
      headers: {
        authorization: 'Bearer '+authToken
      }
    })

    const response = httpMocks.createResponse()
    premiumMiddleware.changeRoleToPremium(request, response, (err, req, res, user) => {
      try {
        expect(err).not.toEqual(expect.anything())
        expect(user.becomePremiumToken).not.toEqual(expect.anything)
        done()
      } catch (error) {
        done(error)
      }
    })
  })

  // Testing changing the role to premium with non valid confirmation code
  it('Shouldn\'t change the role as confirmation code is invalid', async (done) => {
    // get the id of the document in the db to use it to get authorization token
    await User.findOne({}, (err, user) => {
      const id = user._id
      authToken = jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE_IN })
    })
    const request = httpMocks.createRequest({
      method: 'POST',
      url: '/me/premium/atoken',
      params: {
        confirmationCode: 'atokensdsd'
      },
      headers: {
        authorization: 'Bearer '+authToken
      }
    })

    const response = httpMocks.createResponse()
    premiumMiddleware.changeRoleToPremium(request, response, (err, req, res, user) => {
      try {
        expect(err).toEqual(expect.anything())
        expect(err.statusCode).toEqual(404)
        done()
      } catch (error) {
        done(error)
      }
    })
  })

  // Testing changing the role to premium with no confirmation code
  it('Shouldn\'t change the role as no code is provided', async (done) => {
    // get the id of the document in the db to use it to get authorization token
    await User.findOne({}, (err, user) => {
      const id = user._id
      authToken = jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE_IN })
    })
    const request = httpMocks.createRequest({
      method: 'POST',
      url: '/me/premium/atoken',
      params: {      },
      headers: {
        authorization: 'Bearer '+authToken
      }
    })

    const response = httpMocks.createResponse()
    premiumMiddleware.changeRoleToPremium(request, response, (err, req, res, user) => {
      try {
        expect(err).toEqual(expect.anything())
        expect(err.statusCode).toEqual(404)
        done()
      } catch (error) {
        done(error)
      }
    })
  })

  // Testing changing the role with error happening searching for user
  it('Shouldn\'t change role as error occurs when doing so', async (done) => {
    // get the id of the document in the db to use it to get authorization token
    await User.findOne({}, (err, user) => {
      const id = user._id
      authToken = jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE_IN })
    })
    const request = httpMocks.createRequest({
      method: 'POST',
      url: '/me/premium/atoken',
      params: {
        confirmationCode: 'atoken'
      },
      headers: {
        authorization: 'Bearer '+authToken
      }
    })

    const response = httpMocks.createResponse()
    sinon.stub(User, 'findOne').yields(new Error('Couldn\'t search for user in db.'))
    premiumMiddleware.changeRoleToPremium(request, response, (err, req, res, user) => {
      try {
        console.log(err)
        expect(err).toEqual(expect.anything())
        expect(err.statusCode).toEqual(500)
        done()
      } catch (error) {
        done(error)
      }
    })
  })


})


// Testing userController send successfull premium confirmation email
describe('userController send successfull premium confirmation email', () => {
  // the authorization token needed to test
  var authToken = 'testToken'
  // Drop the whole users collection before testing and add a simple user to test with
  beforeEach(async () => {
    sinon.restore()
    await mongoose.connection.collection('users').deleteMany({})

    // Creating the valid user to assign the token to him
    const validUser = new User({
      name: 'omar',
      email: 'omar@email.com',
      password: 'password'
    })
    await validUser.save()
  })

  // Drop the whole users collection after finishing testing
  afterAll(async () => {
    sinon.restore()
    await mongoose.connection.collection('users').deleteMany({})
  })

  // Testing sending the email with no problems
  it('Should send the email successfully', async (done) => {
    const request = httpMocks.createRequest({
      method: 'POST',
      url: '/me/premium/atoken',
      params : { confirmationCode : 'atoken'},
      headers: {
        host: 'dummyhost'
      }
    })

    const user = { email: 'omar@email.com' }
    const response = httpMocks.createResponse()
    premiumMiddleware.sendSuccPremiumMail(request, response, user, (err) => {
      try {
        expect(err).not.toEqual(expect.anything())
        done()
      } catch (error) {
        done(error)
      }
    })
  })

  // Testing failing to send the email confirming becoming premium
  it('Shouldn\'t send the email successfully', async (done) => {
    const request = httpMocks.createRequest({
      method: 'POST',
      url: '/me/premium/atoken',
      params: { confirmationCode: 'atoken'},
      headers: {
        host: 'dummyhost'
      }
    })

    const transport = {
      sendMail: (data, callback) => {
        const err = new Error('Error with sendMail from transport!')
        callback(err, null)
      }
    }
    sinon.stub(userController.nodemailer, 'createTransport').returns(transport)
    const user = { email: 'omar@email.com' }
    const response = httpMocks.createResponse()
    premiumMiddleware.sendSuccPremiumMail(request, response, user, (err) => {
      try {
        expect(err.statusCode).toEqual(502)
        done()
      } catch (error) {
        done(error)
      }
    })
  })
})

//TODO:
// Testing userController whole request to become premium functionality
// describe('userController whole request to become premium functionality', () => {
//   // the authorization token needed to test
//   var authToken = 'testToken'
//   // Drop the whole users collection before testing and add a simple user to test with
//   beforeEach(async () => {
//     sinon.restore()
//     await mongoose.connection.collection('users').deleteMany({})

//     // Creating the valid user to assign the token to him
//     const validUser = new User({
//       name: 'omar',
//       email: 'omar@email.com',
//       password: 'password'
//     })
//     await validUser.save()
//   })

//   // Drop the whole users collection after finishing testing
//   afterAll(async () => {
//     sinon.restore()
//     await mongoose.connection.collection('users').deleteMany({})
//   })

//   // Testing successful email with premium confirmation code
//   it('Should send 204 upon emailing user with confirmation code for premium role', async (done) => {
//     // get the id of the document in the db to use it to get authorization token
//     await User.findOne({}, (err, user) => {
//       const id = user._id
//       authToken = jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE_IN })
//     })
//     const request = httpMocks.createRequest({
//       method: 'POST',
//       url: '/me/premium',
//       headers: {
//         authorization: 'Bearer '+authToken 
//       }
//     })

//     const response = httpMocks.createResponse()
//     userController.requestBecomePremium(request, response, (err) => {
//       try {
//         expect(response.statusCode).toEqual(204)
//         done()
//       } catch (error) {
//         done(error)
//       }
//     })
//   })

// })

// // Testing userController whole request to confirm premium with code functionality
// describe('userController whole request to confirm premium with code functionality', () => {
//   // the authorization token needed to test
//   var authToken = 'testToken'
//   // Drop the whole users collection before testing and add a simple user to test with
//   beforeEach(async () => {
//     sinon.restore()
//     await mongoose.connection.collection('users').deleteMany({})

//     // Creating the valid user to assign the token to him
//     const validUser = new User({
//       name: 'omar',
//       email: 'omar@email.com',
//       password: 'password',
//       becomePremiumToken: 'atoken',
//       becomePremiumExpires: Date.now() + 360000
//     })
//     await validUser.save()
//   })

//   // Drop the whole users collection after finishing testing
//   afterAll(async () => {
//     sinon.restore()
//     await mongoose.connection.collection('users').deleteMany({})
//   })

//   // Testing successful email with premium confirmation code
//   it('Should send 204 upon emailing user with confirmation code for premium role', async (done) => {
//     // get the id of the document in the db to use it to get authorization token
//     await User.findOne({}, (err, user) => {
//       const id = user._id
//       authToken = jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE_IN })
//     })
//     const request = httpMocks.createRequest({
//       method: 'POST',
//       url: '/me/premium/atoken',
//       params: {
//         confirmationCode: 'atoken'
//       },
//       headers: {
//         authorization: 'Bearer '+authToken
//       }
//     })

//     const response = httpMocks.createResponse()
//     userController.confirmBecomePremium(request, response, (err) => {
//       try {
//         expect(response.statusCode).toEqual(204)
//         done()
//       } catch (error) {
//         done(error)
//       }
//     })
//   })

//   // Testing unsuccessful become premium request (wrong code is sent is reason for error here)
//   it('Should send error upon failing to email to become premium', async (done) => {
//     const request = httpMocks.createRequest({
//       method: 'POST',
//       url: '/me/premium/atoken',
//       params: {
//         confirmationCode: 'atsoken'
//       },
//       headers: {
//         authorization: 'Bearer '+authToken
//       }
//     })

//     const response = httpMocks.createResponse()
//     userController.confirmBecomePremium(request, response, (err) => {
//       try {
//         expect(err).toEqual(expect.anything())
//         expect(err.statusCode).toEqual(404) // We're sending without an authorization token, so we get 401 unauthorized error code.
//         done()
//       } catch (error) {
//         done(error)
//       }
//     })
//   })
// })