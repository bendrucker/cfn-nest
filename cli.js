#!/usr/bin/env node

'use strict'

var meow = require('meow')
var assert = require('assert')
var path = require('path')
var fs = require('fs')
var JSONStream = require('JSONStream')
var Transform = require('stream').Transform
var yaml = require('js-yaml')
var schema = require('js-yaml-schema-cfn')
var CfnNest = require('./')

var cli = meow(`
  Usage
    $ cfn-nest <template> --bucket <bucket>

  Options
    --bucket The S3 bucket where nested stacks will be uploaded (required)
    --prefix A prefix that will be appended to the S3 key

  Example
    $ cfn-test web-server.yml --bucket my-templates
`)

var template = cli.input[0]
var extension = path.extname(template)

assert(extension === '.json' || extension === '.yml', 'template must be json or yaml')

var json = extension === '.json'
var Parse = json ? JSONStream.parse : YamlParse
var Stringify = json ? JSONStringify : YamlStringify

fs.createReadStream(template)
  .pipe(Parse())
  .pipe(CfnNest(Object.assign(cli.flags, {
    cwd: path.dirname(
      path.resolve(process.cwd(), template)
    )
  })))
  .on('upload', function (file) {
    console.error(`${file.local} => ${file.s3}`)
  })
  .pipe(Stringify())
  .pipe(process.stdout)

function YamlParse () {
  return new Transform({
    objectMode: true,
    transform: function (chunk, enc, callback) {
      callback(null, yaml.load(chunk, {schema}))
    }
  })
}

function YamlStringify () {
  return new Transform({
    objectMode: true,
    transform: function (chunk, enc, callback) {
      callback(null, yaml.dump(chunk, {schema}))
    }
  })
}

function JSONStringify () {
  return new Transform({
    objectMode: true,
    transform: function (chunk, enc, callback) {
      callback(null, JSON.stringify(chunk, null, 2))
    }
  })
}
