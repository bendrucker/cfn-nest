resource "aws_s3_bucket" "test" {
  bucket = var.bucket
}

resource "aws_iam_user" "cfn_nest" {
  name = "cfn-nest"
}

resource "aws_iam_access_key" "travis" {
  user = aws_iam_user.cfn_nest.name
}

resource "aws_iam_user_policy" "rw_bucket" {
  name   = "cfn-nest-rw-s3"
  user   = aws_iam_user.cfn_nest.name
  policy = data.aws_iam_policy_document.rw_bucket.json
}

data "aws_iam_policy_document" "rw_bucket" {
  statement {
    actions = [
      "s3:*"
    ]

    resources = [
      "${aws_s3_bucket.test.arn}/*"
    ]
  }
}
