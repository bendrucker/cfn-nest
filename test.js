#!/usr/bin/env node

'use strict'

var test = require('tape')
var spawn = require('child_process').spawn
var fs = require('fs')
var path = require('path')
var read = require('read-all-stream')
var schema = require('js-yaml-schema-cfn')
var yaml = require('js-yaml')

var cli = path.resolve(__dirname, 'cli.js')

process.chdir(path.resolve(__dirname, 'fixture'))

var pattern = /https:\/\/s3\.amazonaws\.com\/cfn-nest\/nested-[a-z0-9]+\.template/

test('yaml', function (t) {
  t.plan(6)

  var nest = spawn('node', [
    cli,
    '--yaml',
    '--bucket',
    'cfn-nest'
  ])

  fs.createReadStream('./base.yml')
    .pipe(nest.stdin)

  read(nest.stdout, function (err, data) {
    if (err) return t.end(err)
    data = yaml.load(data, {schema})

    t.ok(data.Resources, 'has resources')
    var Stack = data.Resources.Stack
    t.ok(Stack, 'has Stack')
    t.ok(pattern.test(Stack.Properties.TemplateURL), 'has TemplateURL')
    t.notOk(Stack.Properties.Template, 'removes Template')
  })

  read(nest.stderr, function (err, data) {
    if (err) return t.end(err)

    t.ok(/fixture\/nested\.yml/.test(data), 'prints original filename to stderr')
    t.ok(/s3:\/\/cfn-nest\/nested-[a-z0-9]+\.template/.test(data), 'prints s3 url to stderr')
  })
})

test('json', function (t) {
  t.plan(6)

  var nest = spawn('node', [
    cli,
    '--bucket',
    'cfn-nest'
  ])

  fs.createReadStream('./base.json')
    .pipe(nest.stdin)

  read(nest.stdout, function (err, data) {
    if (err) return t.end(err)
    data = JSON.parse(data)

    t.ok(data.Resources, 'has resources')
    var Stack = data.Resources.Stack
    t.ok(Stack, 'has Stack')
    t.ok(pattern.test(Stack.Properties.TemplateURL), 'has TemplateURL')
    t.notOk(Stack.Properties.Template, 'removes Template')
  })

  read(nest.stderr, function (err, data) {
    if (err) return t.end(err)

    t.ok(/fixture\/nested\.yml/.test(data), 'prints original filename to stderr')
    t.ok(/s3:\/\/cfn-nest\/nested-[a-z0-9]+\.template/.test(data), 'prints s3 url to stderr')
  })
})
