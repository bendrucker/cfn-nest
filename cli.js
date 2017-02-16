#!/usr/bin/env node

'use strict'

var meow = require('meow')
var JSONStream = require('JSONStream')
var Transform = require('stream').Transform
var yaml = require('js-yaml')
var schema = require('js-yaml-schema-cfn')
var CfnNest = require('./')

var cli = meow(`
  Usage
    $ cat template.yml | cfn-nest --bucket my-templates

  Options
    --bucket The S3 bucket where nested stacks will be uploaded (required)
    --prefix A prefix that will be appended to the S3 key
`)

var json = !cli.flags.yaml
var Parse = json ? JSONStream.parse : YamlParse
var Stringify = json ? JSONStringify : YamlStringify

process.stdin
  .pipe(Parse())
  .pipe(CfnNest(cli.flags))
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
