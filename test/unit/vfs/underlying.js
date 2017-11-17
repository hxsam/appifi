const path = require('path')
const fs = require('fs')

const xattr = require('fs-xattr')
const mkdirp = require('mkdirp')
const rimraf = require('rimraf')

const { expect } = require('chai')

const { mkdir } = require('src/vfs/underlying')

const cwd = process.cwd()
const tmptest = path.join(cwd, 'tmptest')

describe(path.basename(__filename) + ' mkdir, vanilla', () => {

  beforeEach(done => rimraf(tmptest, err => err ? done(err) : mkdirp(tmptest, err => done(err))))

  // dirPath parent does not exist
  // dirPath parent is a file
  // dirPath parent is a symolic link (dangerous)

  it('ENOENT if parent does not exist', done => {
    mkdir('tmptest/a/b', null, (err, xstat, resolved) => {
      expect(err.code).to.equal('ENOENT')
      done()
    })
  })

  it('ENOTDIR if parent is file', done => {
    fs.copyFileSync('testdata/foo', 'tmptest/a')
    mkdir('tmptest/a/b', null, (err, xstat, resolved) => {
      expect(err.code).to.equal('ENOTDIR')
      done()
    })
  })

  // This is a dangerous case
  it('ENOENT if parent is (broken) symlink', done => {
    fs.symlinkSync('hello', 'tmptest/a')
    mkdir('tmptest/a/b', null, (err, xstat, resolved) => {
      expect(err.code).to.equal('ENOENT')
      done()
    })
  })

  it ('OK if target does not exist, parent OK', done => {
    fs.mkdirSync('tmptest/a')
    mkdir('tmptest/a/b', null, (err, xstat, resolved) => {
      let attr = JSON.parse(xattr.getSync('tmptest/a/b', 'user.fruitmix'))
      let stat = fs.lstatSync('tmptest/a/b')
      
      expect(xstat).to.deep.equal({
        uuid: attr.uuid,
        type: 'directory',
        name: 'b',
        mtime: stat.mtime.getTime()  
      })
      done()
    })
  })

  it('EEXIST + ECONFLICT if target is dir', done => {
    mkdirp.sync('tmptest/a/b')
    mkdir('tmptest/a/b', null, (err, xstat, resolved) => {
      expect(err.code).to.equal('EEXIST')
      expect(err.xcode).to.equal('ECONFLICT')
      done() 
    })
  })

  it('EEXIST if target is file', done => {
    mkdirp.sync('tmptest/a')
    fs.copyFileSync('testdata/foo', 'tmptest/a/b')
    mkdir('tmptest/a/b', null, (err, xstat, resolved) => {
      expect(err.code).to.equal('EEXIST')
      expect(err.xcode).to.be.undefined
      done()
    })
  })

  // dangerous case
  it('ENOENT if target is (broken) symlink', done => {
    mkdirp.sync('tmptest/a')
    fs.symlinkSync('hello', 'tmptest/a/b')
    mkdir('tmpest/a/b', null, (err, xstat, resolved) => {
      expect(err.code).to.equal('ENOENT')
      done()
    })
  })

})

describe(path.basename(__filename) + ' mkdir, parents', () => {

  beforeEach(done => rimraf(tmptest, err => err ? done(err) : mkdirp(tmptest, err => done(err))))

  it('ENOENT if parent does not exist', done => {
    mkdir('tmptest/a/b', 'parents', (err, xstat, resolved) => {
      expect(err.code).to.equal('ENOENT')
      done()
    })
  }) 

  it('ENOTDIR if parent is file', done => {
    fs.copyFileSync('testdata/foo', 'tmptest/a')
    mkdir('tmptest/a/b', 'parents', (err, xstat, resolved) => {
      expect(err.code).to.equal('ENOTDIR')
      done()
    })
  })

  it ('OK if target does not exist, parent OK', done => {
    fs.mkdirSync('tmptest/a')
    mkdir('tmptest/a/b', 'parents', (err, xstat, resolved) => {
      let attr = JSON.parse(xattr.getSync('tmptest/a/b', 'user.fruitmix'))
      let stat = fs.lstatSync('tmptest/a/b')
      
      expect(xstat).to.deep.equal({
        uuid: attr.uuid,
        type: 'directory',
        name: 'b',
        mtime: stat.mtime.getTime()  
      })

      expect(!!resolved).to.be.false
      done()
    })
  })

  it ('OK if target is dir', done => {
    mkdirp.sync('tmptest/a/b')
    mkdir('tmptest/a/b', 'parents', (err, xstat, resolved) => {
      let attr = JSON.parse(xattr.getSync('tmptest/a/b', 'user.fruitmix'))
      let stat = fs.lstatSync('tmptest/a/b')
      
      expect(xstat).to.deep.equal({
        uuid: attr.uuid,
        type: 'directory',
        name: 'b',
        mtime: stat.mtime.getTime()  
      })
      expect(resolved).to.be.true
      done()
    })
  })

  it('EEXIST if target is file', done => {
    mkdirp.sync('tmptest/a')
    fs.copyFileSync('testdata/foo', 'tmptest/a/b')
    mkdir('tmptest/a/b', 'parents', (err, xstat, resolved) => {
      expect(err.code).to.equal('EEXIST')
      expect(err.xcode).to.be.undefined
      done()
    })
  })

})

describe(path.basename(__filename) + ' mkdir, auto rename', () => {

  beforeEach(done => rimraf(tmptest, err => err ? done(err) : mkdirp(tmptest, err => done(err))))

  it('ENOENT if parent does not exist', done => {
    mkdir('tmptest/a/b', 'rename', (err, xstat, resolved) => {
      expect(err.code).to.equal('ENOENT')
      done()
    })
  })

  it('ENOTDIR if parent is file', done => {
    fs.copyFileSync('testdata/foo', 'tmptest/a')
    mkdir('tmptest/a/b', 'rename', (err, xstat, resolved) => {
      expect(err.code).to.equal('ENOTDIR')
      done()
    })
  })

  it ('OK if target does not exist, parent OK', done => {
    fs.mkdirSync('tmptest/a')
    mkdir('tmptest/a/b', 'rename', (err, xstat, resolved) => {
      if (err) return done(err)
      let attr = JSON.parse(xattr.getSync('tmptest/a/b', 'user.fruitmix'))
      let stat = fs.lstatSync('tmptest/a/b')
      
      expect(xstat).to.deep.equal({
        uuid: attr.uuid,
        type: 'directory',
        name: 'b',
        mtime: stat.mtime.getTime()  
      })

      expect(!!resolved).to.be.false
      done()
    })
  })

  it('OK if target is dir', done => {
    mkdirp.sync('tmptest/a/b')
    mkdir('tmptest/a/b', 'rename', (err, xstat, resolved) => {
      if (err) return done(err)

      let name = 'b (2)'
      let dirPath = path.join('tmptest', 'a', name)
      let attr = JSON.parse(xattr.getSync(dirPath, 'user.fruitmix'))
      let stat = fs.lstatSync(dirPath)

      expect(xstat).to.deep.equal({
        uuid: attr.uuid,
        type: 'directory',
        name,
        mtime: stat.mtime.getTime()
      }) 
      
      expect(resolved).to.be.true  
      done() 
    })
  })

  it('OK if target is file', done => {
    mkdirp.sync('tmptest/a')
    fs.copyFileSync('testdata/foo', 'tmptest/a/b')
    mkdir('tmptest/a/b', 'rename', (err, xstat, resolved) => {
      if (err) return done(err)

      let name = 'b (2)'
      let dirPath = path.join('tmptest', 'a', name)
      let attr = JSON.parse(xattr.getSync(dirPath, 'user.fruitmix'))
      let stat = fs.lstatSync(dirPath)

      expect(xstat).to.deep.equal({
        uuid: attr.uuid,
        type: 'directory',
        name,
        mtime: stat.mtime.getTime()
      }) 
      
      expect(resolved).to.be.true  
      done() 
    })
  })

})







