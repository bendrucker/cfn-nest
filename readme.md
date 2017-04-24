# cfn-nest [![Build Status](https://travis-ci.org/bendrucker/cfn-nest.svg?branch=master)](https://travis-ci.org/bendrucker/cfn-nest)

> Transform relative stack paths in a CloudFormation template into full S3 URLs


## Install

```
$ npm install --save cfn-nest
```


## Usage

Given a pseudo-valid nested stack template:

```json
{
  "Resources": {
    "Nested": {
      "Type": "AWS::CloudFormation::Stack",
      "Properties": {
        "Template": "nested.json"
      }
    }
  }
}
```

### CLI

```sh
cfn-nest template.json --bucket my-templates
```

Any nested templates will be uploaded to S3 as [required by CloudFormation](http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-stack.html#cfn-cloudformation-stack-templateurl). The `Template` property will be replaced by a valid `TemplateURL`. This URL contains an MD5 hash of the file contents so different versions will always produce unique URLs. Un-nesting is performed *recursively* so you can write templates that reference templates that reference other templates (and so on).

The `Template` path is resolved *relative to the template source file*.

### API

```js
var CfnNest = require('cfn-nest')
var JSONStream = require('JSONStream')
var through = require('through2')

fs.createReadStream('template.json')
  .pipe(JSONStream.parse())
  .pipe(CfnNest({bucket: 'my-templates'}))
  .pipe(through.obj(function (chunk, enc, callback) {
    callback(null, JSON.stringify(chunk))  
  }))
  .pipe(process.stdout)
```

## API

#### `CfnNest(options)` -> `stream`

Creates a new `Transform` stream that expects parsed CloudFormation template objects as input.

##### options

###### bucket

*Required*  
Type: `string`

The name of the S3 bucket to use.

###### cwd

Type: `string`  
Default: `process.cwd()`

The working directory to use when resolving template paths. 

#### `stream.on('upload', handler)`

##### handler

*Required*  
Type: `function`  
Arguments: `file`

A listener that will be called after each file upload. The `file` is an object with `local` and `s3` path properties.



## License

MIT © [Ben Drucker](http://bendrucker.me)
