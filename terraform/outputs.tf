output "s3_spa_site_URL" {
  value = "${aws_s3_bucket.WebsiteBucket.id}"
}
