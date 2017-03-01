#!/usr/bin/env node

'use strict'

var meow = require('meow')
var path = require('path')
var cfnTemplate = require('cfn-template-stream')
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

cfnTemplate
  .fromFile(template)
  .pipe(CfnNest(Object.assign(cli.flags, {
    cwd: path.dirname(
      path.resolve(process.cwd(), template)
    )
  })))
  .on('upload', function (file) {
    console.error(`${file.local} => ${file.s3}`)
  })
  .pipe(cfnTemplate.stringify(extension))
  .pipe(process.stdout)
