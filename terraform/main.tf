locals {
  s3_origin_id = "S3-${aws_s3_bucket.WebsiteBucket.id}"
}

resource "aws_iam_openid_connect_provider" "default" {
  url = "https://${var.Auth0ConnectProvider}/"

  client_id_list = [
    "${var.Auth0ClientID}"
  ]

  thumbprint_list = [
    "9e99a48a9960b14926bb7f3b02e22da2b0ab7280",
  ]
}

resource "aws_s3_bucket" "WebsiteBucket" {
  bucket = var.StaticWebResourcesBucketName
  acl    = "private"
  force_destroy = true
  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm     = "AES256"
      }
    }
  }

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "DELETE", "PUT", "POST"]
    allowed_origins = ["https://${var.StaticWebResourcesBucketName}"]
    max_age_seconds = 3000
  }

  tags          = {
    ProjectAndOwner = "${var.ProjectAndOwner}"
    Environment = "${var.env}"
  }
}

resource "aws_s3_bucket" "PrivateBucket" {
  bucket = "${var.StaticWebResourcesBucketName}-db"
  acl    = "private"
  force_destroy = true
  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm     = "AES256"
      }
    }
  }

  tags          = {
    ProjectAndOwner = "${var.ProjectAndOwner}"
    Environment = "${var.env}"
  }
}

resource "aws_s3_bucket_metric" "Entire-bucket" {
  bucket = aws_s3_bucket.WebsiteBucket.id
  name   = var.StaticWebResourcesBucketName
}

resource "aws_s3_bucket_public_access_block" "website" {
  bucket = aws_s3_bucket.WebsiteBucket.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_public_access_block" "db" {
  bucket = aws_s3_bucket.PrivateBucket.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_policy" "WebsiteBucketPolicy" {
  bucket = aws_s3_bucket.WebsiteBucket.id

  policy = <<POLICY
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal":{"CanonicalUser":"${aws_cloudfront_origin_access_identity.CloudFrontOriginAccessIdentity.s3_canonical_user_id}"},
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::${aws_s3_bucket.WebsiteBucket.id}/*"
    },
    {
      "Effect": "Allow",
      "Principal":{"CanonicalUser":"${aws_cloudfront_origin_access_identity.CloudFrontOriginAccessIdentity.s3_canonical_user_id}"},
      "Action": "s3:ListBucket*",
      "Resource": "arn:aws:s3:::${aws_s3_bucket.WebsiteBucket.id}"
    }
  ]
}
POLICY
}

resource "aws_cloudfront_origin_access_identity" "CloudFrontOriginAccessIdentity" {
  comment = "CloudFront Origin Access Identity"
}

resource "aws_cloudfront_distribution" "Distribution" {
  origin {
    domain_name = aws_s3_bucket.WebsiteBucket.bucket_domain_name
    origin_id   = local.s3_origin_id

    s3_origin_config {
      origin_access_identity = "origin-access-identity/cloudfront/${aws_cloudfront_origin_access_identity.CloudFrontOriginAccessIdentity.id}"
    }
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"

  aliases = ["${aws_s3_bucket.WebsiteBucket.id}"]

  logging_config {
    include_cookies = false
    bucket          = aws_s3_bucket.WebsiteBucket.bucket_domain_name
    prefix          = "logs-"
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = local.s3_origin_id

    forwarded_values {
      query_string = false

      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 0
    max_ttl                = 0
    compress               = false
  }

  price_class = "PriceClass_200"

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn = "arn:aws:acm:us-east-1:773165263293:certificate/ad3bf919-2251-496a-b118-580bcd2ab93c"
    ssl_support_method = "sni-only"
    minimum_protocol_version = "TLSv1.2_2018"
  }

  tags          = {
    ProjectAndOwner = "${var.ProjectAndOwner}"
    Environment = "${var.env}"
  }
}

provider "aws" {
  alias   = "dns"
  access_key = var.DNS_ACCESS_KEY
  secret_key = var.DNS_SECRET_KEY
  region     = "us-east-1"
}

resource "aws_route53_record" "alias_route53_record" {
  provider = aws.dns
  zone_id = var.DNS_ZONE_ID
  name    = aws_s3_bucket.WebsiteBucket.id
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.Distribution.domain_name
    zone_id                = aws_cloudfront_distribution.Distribution.hosted_zone_id
    evaluate_target_health = true
  }
}

#---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
#*********************************************************************************************************************
# Auth0 private access role and policy
#**********************************************************************************************************************

resource "aws_iam_role" "private_s3_access_role" {
  name               = "private-s3-role"
  assume_role_policy = <<POLICY
{
    "Version": "2012-10-17",
    "Statement": {
        "Effect": "Allow",
        "Principal": {"Federated": "${aws_iam_openid_connect_provider.default.arn}"},
        "Action": "sts:AssumeRoleWithWebIdentity",
        "Condition": {
            "StringEquals": {"${var.Auth0ConnectProvider}:aud": "${var.Auth0ClientID}"}
        }
    }
}
POLICY
}

resource "aws_iam_policy" "policy" {
  name        = "private_bucket_access"
  description = "policy for auth0 access to private bucket"
  policy      = <<POLICY
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:ListBucket*"
            ],
            "Resource": [
                "arn:aws:s3:::${var.StaticWebResourcesBucketName}-db"
            ],
            "Condition": {
                "StringLike": {
                    "s3:prefix": [
                        "${var.Auth0ConnectProvider}/:sub/*"
                    ]
                }
            }
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject"
            ],
            "Resource": [
                "arn:aws:s3:::${var.StaticWebResourcesBucketName}-db/${var.Auth0ConnectProvider}/:sub/",
                "arn:aws:s3:::${var.StaticWebResourcesBucketName}-db/${var.Auth0ConnectProvider}/:sub/*"
            ]
        }
    ]
}
POLICY
}

resource "aws_iam_policy_attachment" "attach" {
  name       = "attachment"
  roles      = ["${aws_iam_role.private_s3_access_role.name}"]
  policy_arn = aws_iam_policy.policy.arn
}

#---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
#*********************************************************************************************************************
#Cloud State Management
#**********************************************************************************************************************

//Terraform backend config
terraform {
  backend "remote" {
    hostname = "app.terraform.io"
    organization = "NLT"

    workspaces {
      name = "Pagaf"
    }
  }
}
