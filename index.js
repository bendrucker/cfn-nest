'use strict'

var assert = require('assert')
var Transform = require('stream').Transform
var inherits = require('util').inherits
var filter = require('filter-obj')
var map = require('map-values')
var parallel = require('run-parallel')
var waterfall = require('run-waterfall')
var partial = require('ap').partial
var path = require('path')
var hash = require('hasha')
var cfnTemplate = require('cfn-template-stream')
var concat = require('concat-stream')
var S3 = require('aws-sdk/clients/s3')

var s3 = new S3()

module.exports = CfnNest

inherits(CfnNest, Transform)

function CfnNest (options) {
  if (!(this instanceof CfnNest)) {
    return new CfnNest(options)
  }

  Transform.call(this, { objectMode: true })

  this.options = options || {}
  this.options.cwd = this.options.cwd || process.cwd()

  assert(this.options.bucket, 's3 bucket is required')
}

CfnNest.prototype._transform = function _transform (chunk, enc, callback) {
  var template = Object.assign({}, chunk)

  var resources = template.Resources
  var stacks = filter(resources, function (key, resource) {
    return resource.Type === 'AWS::CloudFormation::Stack'
  })

  parallel(map(stacks, (stack) => this.unstack.bind(this, stack)), done)

  function done (err, transformed) {
    if (err) return callback(err)
    callback(null, Object.assign(template, {
      Resources: Object.assign({}, resources, transformed)
    }))
  }
}

CfnNest.prototype.unstack = function unstack (stack, callback) {
  var source = path.resolve(this.options.cwd, stack.Properties.Template)

  cfnTemplate
    .fromFile(source)
    .pipe(CfnNest(Object.assign({}, this.options, {
      cwd: path.dirname(source)
    })))
    .on('upload', this.emit.bind(this, 'upload'))
    .pipe(cfnTemplate.Stringify(path.extname(source)))
    .pipe(concat((template) => {
      waterfall([
        partial(createHash, source, template),
        this.upload.bind(this),
        partial(setUrl, stack)
      ], callback)
    }))
}

CfnNest.prototype.upload = function upload (hashed, callback) {
  var key = (this.options.prefix || '') + hashed.filename
  var params = {
    Bucket: this.options.bucket,
    Key: key,
    Body: hashed.data
  }

  s3.putObject(params, (err) => {
    if (err) return callback(err)

    this.emit('upload', {
      local: hashed.original,
      s3: `s3://${params.Bucket}/${key}`
    })

    callback(null, `https://s3.amazonaws.com/${params.Bucket}/${key}`)
  })
}

function createHash (templatePath, data, callback) {
  var extension = path.extname(templatePath)
  var name = path.basename(templatePath, extension)
  var hashed = hash(data, { algorithm: 'md5' })

  callback(null, {
    data,
    filename: `${name}-${hashed}.template`,
    original: templatePath
  })
}

function setUrl (stack, url, callback) {
  stack = Object.assign({}, stack)
  delete stack.Properties.Template
  stack.Properties.TemplateURL = url
  callback(null, stack)
}
