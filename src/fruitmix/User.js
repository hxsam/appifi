const EventEmitter = require('events')
const UUID = require('uuid')
const { isUUID, isNonNullObject, isNonEmptyString } = require('../lib/assertion')
const DataStore = require('../lib/DataStore')
const { passwordEncrypt, md4Encrypt } = require('../lib/utils')

const USER_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  DELETED: 'DELETED'
}

/**

The corresponding test file is test/unit/fruitmix/user.js

Using composition instead of inheritance.
*/
class User extends EventEmitter {
  /**
  Create a User

  Add other properties to opts if required.

  @param {object} opts
  @param {string} opts.file - path of users.json
  @param {string} opts.tmpDir - path of tmpDir (should be suffixed by `users`)
  @param {boolean} opts.isArray - should be true since users.json is an array
  */
  constructor (opts) {
    super()
    this.conf = opts.configuration
    this.fruitmixDir = opts.fruitmixDir

    this.store = new DataStore({
      file: opts.file,
      tmpDir: opts.tmpDir,
      isArray: true
    })

    this.store.on('Update', (...args) => this.emit('Update', ...args))

    Object.defineProperty(this, 'users', {
      get () {
        return this.store.data
      }
    })
  }

  handleDriveDeleted (userUUID) {
    this.removeUser(userUUID, err => {
      console.log('user deleted: ', userUUID)
      if (err) console.log('user delete failed: ', err)
    })
  }

  getUser (userUUID) {
    return this.users.find(u => u.uuid === userUUID)
  }

  /**

  TODO lastChangeTime is required by smb
  TODO createTime is required by spec
  */
  createUser (props, callback) {
    let uuid = UUID.v4()
    this.store.save(users => {
      let isFirstUser = users.length === 0
      let { username, phicommUserId, password, smbPassword } = props
      
      let cU = users.find(u => u.username === username)
      if (cU && cU.status !== USER_STATUS.DELETED) throw new Error('username already exist')
      let pU = users.find(u => u.phicommUserId === phicommUserId)
      if (pU && pU.status !== USER_STATUS.DELETED) throw new Error('phicommUserId already exist')

      let newUser = {
        uuid,
        username: props.username,
        isFirstUser,
        phicommUserId: props.phicommUserId,
        password: props.password,
        smbPassword: props.smbPassword,
        status: USER_STATUS.ACTIVE
      }
      return [...users, newUser]
    }, (err, data) => {
      if (err) return callback(err)
      return callback(null, data.find(x => x.uuid === uuid))
    })
  }

  updateUser (userUUID, props, callback) {
    let { username, status } = props
    this.store.save(users => {
      let index = users.findIndex(u => u.uuid === userUUID)
      if (index === -1) throw new Error('user not found')
      let nextUser = Object.assign({}, users[index])
      if (username) {
        if (user.find(u => u.username === username)) throw new Error('username already exist')
        nextUser.username = username
      }
      if (status) {
        if (nextUser.status === USER_STATUS.DELETED) throw new Error('deleted user can not update')
        nextUser.status = status
      }
      return [...users.slice(0, index), nextUser, ...users.slice(index + 1)]
    }, (err, data) => {
      if (err) return callback(err)
      return callback(null, data.find(x => x.uuid === userUUID))
    })
  }

  deleteUser (userUUID, callback) {
    this.store.save(users => {
      let index = users.findIndex(u => u.uuid === userUUID)
      if (index === -1) throw new Error('user not found')
      let user = Object.assign({}, users[index])
      user.status = USER_STATUS.DELETED
      return [...users.slice(0, index), user, ...users.slice(index + 1)]
    }, callback)
  }

  removeUser (userUUID, callback) {
    this.store.save(users => {
      let index = users.findIndex(u => u.uuid === userUUID)
      if (index === -1) throw new Error('user not found')
      return [...users.slice(0, index), ...users.slice(index + 1)]
    }, callback)
  }

  /**

  @param {object} props
  @param {string} props.password - password
  @param {string} props.smbPassword - smb password
  @param {boolean} [props.encrypted] - if true, both passwords are considered to be encrypted
  */
  updatePassword (userUUID, props, callback) {
    try {
      if (!isUUID(userUUID)) throw new Error(`userUUID ${userUUID} is not a valid uuid`)
      if (!isNonNullObject(props)) throw new Error('props is not a non-null object')
      if (props.password !== undefined && !isNonEmptyString(props.password)) throw new Error('password must be a non-empty string if provided')
      if (props.smbPassword !== undefined && !isNonEmptyString(props.smbPassword)) throw new Error('smbPassword must be a non-empty string if provided')
      if (!props.password && !props.smbPassword) throw new Error('both password and smbPassword undefined')
      if (props.encrypted !== undefined && typeof props.encrypted !== 'boolean') throw new Error('encrypted must be either true or false')

      // TODO props validation should be in router, I guess
    } catch (e) {
      return process.nextTick(() => callback(e))
    }
    // props.encrypted = !!props.encrypted

    let { password, smbPassword, encrypted } = props
    this.store.save(users => {
      let index = users.findIndex(u => u.uuid === userUUID)
      if (index === -1) throw new Error('user not found')
      let nextUser = Object.assign({}, users[index])
      if (password) nextUser.password = encrypted ? password : passwordEncrypt(password, 10)
      if (smbPassword) nextUser.smbPassword = encrypted ? smbPassword : md4Encrypt(smbPassword)
      return [...users.slice(0, index), nextUser, ...users.slice(index + 1)]
    }, (err, data) => {
      if (err) return callback(err)
      return callback(null, data.find(x => x.uuid === userUUID))
    })
  }

  bindFirstUser (boundUser) {
    this.store.save(users => {
      let index = users.findIndex(u => u.isFirstUser)
      if (index === -1) {
        return [{
          uuid: UUID.v4(),
          username: boundUser.name || 'admin',
          isFirstUser: true,
          phicommUserId: boundUser.phicommUserId,
          password: boundUser.password,
          smbPassword: '',
          status: USER_STATUS.ACTIVE
        }]
      } else {
        let firstUser = users[index]
        if (firstUser.phicommUserId !== boundUser.phicommUserId) {
          console.log('===================')
          console.log('This is not an error, but fruitmix received a bound user')
          console.log('different than the previous one, exit')
          console.log('===================')
          process.exit(67)
        } else if (firstUser.password !== boundUser.password) {
          let newFirstUser = Object.assign({}, firstUser, { password: boundUser.password })
          return [
            ...users.slice(0, index),
            newFirstUser,
            ...users.slice(index + 1)
          ]
        } else {
          return users // no change
        }
      }
    }, 
    err => err 
    ? console.log(`user module failed to bind first user to ${boundUser.phicommUserId}`)
    : console.log(`user module bound first user to ${boundUser.phicommUserId} successfully`)) 
  }

  destory (callback) {
    this.store.destroy(callback)
  }

  basicInfo (user) {
    return {
      uuid: user.uuid,
      username: user.username,
      isFirstUser: user.isFirstUser,
      phicommUserId: user.phicommUserId
    }
  }

  fullInfo (user) {
    return {
      uuid: user.uuid,
      username: user.username,
      isFirstUser: user.isFirstUser,
      phicommUserId: user.phicommUserId,
      password: !!user.password,
      smbPassword: !!user.smbPassword
    }
  }

  /**
  Implement LIST method
  */
  LIST (user, props, callback) {
    if (!user) {
      // basic info of all users
      return process.nextTick(() => callback(null, this.users.map(u => this.basicInfo(u))))
    } else if (user.isFirstUser) {
      // full info of all users
      return process.nextTick(() => callback(null, this.users.map(u => this.fullInfo(u))))
    } else {
      // full info of the user
      return process.nextTick(() => {
        let u = this.users.find(u => u.uuid === user.uuid)
        if (!u) {
          let err = new Error('authenticated user not found in user resource')
          err.status = 500
          callback(err)
        } else {
          callback(null, [this.fullInfo(u)])
        }
      })
    }
  }

  /**
  Implement POST method

  wisnuc: the first user can be created by anonymous user
  phicomm: the first user cannot be created by api. It must be injected.
  */
  POST (user, props, callback) {
    if (!isNonNullObject(props)) return callback(Object.assign(new Error('props must be non-null object'), { status: 400 }))
    let recognized = ['username', 'password', 'smbPassword', 'phicommUserId']
    Object.getOwnPropertyNames(props).forEach(key => {
      if (!recognized.includes(key)) throw Object.assign(new Error(`unrecognized prop name ${key}`), { status: 400 })
    })
    if (!isNonEmptyString(props.username)) return callback(Object.assign(new Error('username must be non-empty string'), { status: 400 }))
    if (!isNonEmptyString(props.phicommUserId)) return callback(Object.assign(new Error('phicommUserId must be non-empty string'), { status: 400 }))
    if (props.password && !isNonEmptyString(props.password)) return callback(Object.assign(new Error('password must be non-empty string'), { status: 400 }))
    if (this.users.length && (!user || !user.isFirstUser)) return process.nextTick(() => callback(Object.assign(new Error('Permission Denied'), { status: 403 })))
    
    let u = this.users.find(u => u.username === props.username)
    if (u && u.status !== USER_STATUS.DELETED) return callback(Object.assign(new Error('username exist'), { status: 400 }))

    let pU = this.users.find(u => u.phicommUserId === props.phicommUserId)
    if (u && u.status !== USER_STATUS.DELETED) return callback(Object.assign(new Error('phicommUserId exist'), { status: 400 }))

    this.createUser(props, (err, user) => err ? callback(err) : callback(null, this.fullInfo(user)))
  }

  /**
  Implement GET method
  */
  GET (user, props, callback) {
    let u = this.getUser(props.userUUID)
    if (!u) return process.nextTick(() => callback(Object.assign(new Error('user not found'), { status: 404 })))
    if (user.isFirstUser || user.uuid === u.uuid) return process.nextTick(() => callback(null, this.fullInfo(u)))
    return process.nextTick(Object.assign(new Error('Permission Denied'), { status: 403 }))
  }

  /**
  Implement PATCH
  */
  PATCH (user, props, callback) {
    if (props.password) {
      let recognized = ['password', 'smbPassword', 'encrypted', 'userUUID']
      if (!Object.getOwnPropertyNames(props).every(k => recognized.includes(k))) {
        return process.nextTick(() => callback(Object.assign(new Error('too much props in body'), { status: 400 })))
      }
      if (user.uuid !== props.userUUID) return process.nextTick(() => callback(Object.assign(new Error('Permission Denied'), { status: 403 })))
      this.updatePassword(props.userUUID, props, (err, user) => err ? callback(err) : callback(null, this.fullInfo(user)))
    } else {
      let recognized = ['username', 'status', 'userUUID']
      if (Object.getOwnPropertyNames(props).every(k => recognized.includes(k))) {
        return process.nextTick(() => callback(Object.assign(new Error('too much props in body'), { status: 400 })))
      }
      
      if (props.username && !isNonEmptyString(props.username)) return callback(Object.assign(new Error('username must be non-empty string'), { status: 400 }))
      
      let u = this.users.find(u => u.username === props.username)
      if (u && u.status !== USER_STATUS.DELETED) return callback(Object.assign(new Error('username exist'), { status: 400 }))
      let recognizedStatus = [USER_STATUS.ACTIVE, USER_STATUS.INACTIVE, USER_STATUS.DELETED]

      if (props.status && !user.isFirstUser ) return callback(Object.assign(new Error('Permission Denied'), { status: 403 }))
      if (props.status && !recognizedStatus.includes(props.status)) return callback(Object.assign(new Error('unknown status'), { status: 400 }))

      if (!user.isFirstUser && user.uuid !== props.userUUID) return process.nextTick(() => callback(Object.assign(new Error('Permission Denied'), { status: 403 })))
      this.updateUser(props.userUUID, props, (err, user) => err ? callback(err) : callback(null, this.fullInfo(user)))
    }
  }

  DELETE (user, props, callback) {
    if (!isUUID(props.userUUID) || this.users.findIndex(u => u.uuid === props.userUUID) === -1) return callback(Object.assign(new Error('userUUID error'), { status: 400 }))
    if (!user.isFirstUser) return callback(Object.assign(new Error('Permission Denied'), { status: 403 }))
    this.deleteUser(props.userUUID, callback)
  }
}

User.prototype.USER_STATUS = USER_STATUS

module.exports = User
