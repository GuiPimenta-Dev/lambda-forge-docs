# Resizing, Watermarking and QR Code Generation with AWS S3 and Email Delivery via SMTP

Create a bucket per stage

Use the public Pillow layer

self.pillow_layer = \_lambda.LayerVersion.from_layer_version_arn(
scope,
id="PillowLayer",
layer_version_arn="arn:aws:lambda:us-east-2:770693421928:layer:Klayers-p39-pillow:1",
)

Add pillow pillow==10.3.0 to requirements.txt

forge function resize --method "POST" --description "Resizes an image and stores it on S3" --belongs-to "images" --public --no-tests

Configure secrets manager, with a secret with email, password. secrets-manager name: mailer

Create an app password. (Point to article teaching how create an app password)

forge function mailer --description "Sends an email when an image enters the bucket" --belongs-to "images" --no-api --no-tests
