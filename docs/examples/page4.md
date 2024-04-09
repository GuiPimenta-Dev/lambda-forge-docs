# Converting Image to QR Code with AWS S3, Secrets Manager and SMTP Email Delivery

In this part, we're going to cover how to make a function that turns images uploaded by users into QR codes. When a user sends a request, the image gets processed, saved on Amazon S3, and then sent to them via email so they can easily check out the results.

## Configuring S3 Buckets for Each Deployment Stage

Let's establish three distinct buckets, each dedicated to a specific stage: `Dev-Lambda-Forge-Images`, `Staging-Lambda-Forge-Images` and `Prod-Lambda-Forge-Images`.

<div class="admonition note">
<p class="admonition-title">Note</p>
<p>Keep in mind that your bucket name must be unique across all AWS regions. Therefore, you'll need to select distinct names for your project.</p>
</div>

Now place the arns on your `cdk.json`.

```python title="cdk.json" linenums="51" hl_lines="6 14 22"
   "dev": {
      "base_url": "https://api.lambda-forge.com/dev",
      "arns": {
        "urls_table": "$DEV-URLS-TABLE-ARN",
        "users_table": "$DEV-USERS-TABLE-ARN",
        "images_bucket": "$DEV-IMAGES-BUCKET-ARN"
      }
    },
    "staging": {
      "base_url": "https://api.lambda-forge.com/staging",
      "arns": {
        "urls_table": "$STAGING-URLS-TABLE-ARN",
        "users_table": "$STAGING-USERS-TABLE-ARN",
        "images_bucket": "$STAGING-IMAGES-BUCKET-ARN"
      }
    },
    "prod": {
      "base_url": "https://api.lambda-forge.com",
      "arns": {
        "urls_table": "$PROD-URLS-TABLE-ARN",
        "users_table": "$PROD-USERS-TABLE-ARN",
        "images_bucket": "$PROD-IMAGES-BUCKET-ARN"
      }
    }
```

### Incorporating S3 Into the Service Class

The next step in improving our application involves integrating the S3 service into our service layer, facilitating direct communication with S3 buckets. To achieve this, execute the following command:

`forge service s3`

This command generates a new service file named s3.py within the infra/services directory, as illustrated below:

```
infra
├── services
    ├── __init__.py
    ├── api_gateway.py
    ├── aws_lambda.py
    ├── dynamo_db.py
    ├── layers.py
    └── s3.py
```

Below showcases the updated structure of our Service class, now incorporating the S3 service, indicating the successful integration:

```python title="infra/services/__init__.py" hl_lines="14"
from infra.services.s3 import S3
from infra.services.dynamo_db import DynamoDB
from infra.services.api_gateway import APIGateway
from infra.services.aws_lambda import AWSLambda
from infra.services.layers import Layers


class Services:
    def __init__(self, scope, context) -> None:
        self.api_gateway = APIGateway(scope, context)
        self.aws_lambda = AWSLambda(scope, context)
        self.layers = Layers(scope)
        self.dynamo_db = DynamoDB(scope, context)
        self.s3 = S3(scope, context)
```

Here is the newly established S3 class:

```python title="infra/services/s3"
from aws_cdk import aws_s3 as s3
from aws_cdk import aws_s3_notifications


class S3:
    def __init__(self, scope, context) -> None:

        # self.s3 = s3.Bucket.from_bucket_arn(
        #     scope,
        #     "S3",
        #     bucket_arn=context.resources["arns"]["s3_arn"],
        # )
        ...

    def create_trigger(self, bucket, function, stages=None):
        if stages and self.context.stage not in stages:
            return

        notifications = aws_s3_notifications.LambdaDestination(function)
        bucket.add_event_notification(s3.EventType.OBJECT_CREATED, notifications)
```

As seen, Forge has created the class with a helper method to streamline the creation of a trigger between a bucket and a lambda function.

Let's update the class variables to directly reference our recently created bucket.

```python title="infra/services/s3.py" hl_lines="4-8" linenums="5"
class S3:
    def __init__(self, scope, context: dict) -> None:

        self.images_bucket = s3.Bucket.from_bucket_arn(
            scope,
            "ImagesBucket",
            bucket_arn=context.resources["arns"]["images_bucket"],
        )
```

Excellent! This approach configures our framework to utilize each ARN on its designated stage effectively.

## Using External Libraries as Lambda Layers

We are going to use the requests library to download content from user-provided URLs. Public ARNs for layers are available [here](https://api.klayers.cloud//api/v2/p3.9/layers/latest/us-east-2/json).

The ARN we require is listed below:

- Requests: `arn:aws:lambda:us-east-2:770693421928:layer:Klayers-p39-requests:19`

To convert the image into a qr code, we are also going to use an external library called `qrcode`. Unlike the readily available AWS layer for Requests, we're dealing with a library for which AWS doesn't provide a public layer.

To seamlessly incorporate this library, refer to the article [Deploying an External Library to AWS Lambda as a Layer]() for guidance on deploying the qrcode library. Once you obtain the ARN of your deployed Lambda layer, simply add it to the Layers class.

```python title="infra/services/layers.py" hl_lines="8-12 14-18"
from aws_cdk import aws_lambda as _lambda
from lambda_forge import Path


class Layers:
    def __init__(self, scope) -> None:

        self.requests_layer = _lambda.LayerVersion.from_layer_version_arn(
            scope,
            id="RequestsLayer",
            layer_version_arn="arn:aws:lambda:us-east-2:770693421928:layer:Klayers-p39-requests:19",
        )

        self.qrcode_layer = _lambda.LayerVersion.from_layer_version_arn(
            scope,
            id="QrCodeLayer",
            layer_version_arn="$QR-CODE-LAYER",
        )
```

It's essential to include both libraries in our `requirements.txt` file to ensure they are installed when deploying our application.

```title="requirements.txt" linenums="15"
requests==2.28.1
qrcode==7.4.2
```

## Image to QR Code

With our layers now set up, it's time to create our new function.

```
forge function qrcode --method "POST" --description "Converts an image into a qr code" --belongs-to "images" --no-tests --public --endpoint "images/qrcode"
```

We now have the following directory:

```
functions
└── images
    ├── qrcode
    │   ├── __init__.py
    │   ├── config.py
    │   └── main.py
    └── utils
        └── __init__.py
```

This function will receive from the user a `url` to convert the image parameter and a `email` parameter to send the email notification. Let's proceed with its implementation.

```python title="functions/images/img_to_qrcode/main.py" linenums="1"
import json
import os
import uuid
from io import BytesIO

import boto3
import qrcode
import requests


def lambda_handler(event, context):

    # Parse the input event to get the URL of the image and the S3 bucket name
    body = json.loads(event["body"])
    url = body.get("url")

    # Retrieve the S3 bucket name from environment variables
    bucket_name = os.environ.get("BUCKET_NAME")

    # Download the image
    response = requests.get(url)
    image_bytes = BytesIO(response.content)

    # Generate QR code from the image
    qr = qrcode.QRCode()
    qr.add_data(url)
    qr.make()

    # Create an image from the QR code
    qr_image = qr.make_image()

    # Convert the QR code image to bytes
    qr_byte_arr = BytesIO()
    qr_image.save(qr_byte_arr, format="PNG")
    qr_byte_arr = qr_byte_arr.getvalue()

    # Create the file name with a uuid
    file_name = f"{uuid.uuid4()}.jpg"

    # Initialize the S3 client
    s3_client = boto3.client("s3")

    # Upload the QR code image to S3
    s3_client.put_object(
        Bucket=bucket_name,
        Key=file_name,
        Body=qr_byte_arr,
        ContentType="image/png",
        Metadata={"url": url, "email": body.get("email")},
    )

    return {"statusCode": 200, "message": "QR code generated and uploaded successfully"}
```

<div class="admonition note">
    <p class="admonition-title">Note</p>
<p>It's important to note that we're storing the file with both the URL and the email as metadata on the S3 bucket, specifically on line 49. This detail will be crucial for retrieving the emails later to send them to the recipients.
</p>
</div>

Now, it's configuration.

```python title="functions/images/qrcode/config.py" hl_lines="12-15 20"
from infra.services import Services


class QrcodeConfig:
    def __init__(self, services: Services) -> None:

        function = services.aws_lambda.create_function(
            name="Qrcode",
            path="./functions/image",
            description="Turns image into qr code",
            directory="qrcode",
            layers=[services.layers.requests_layer, services.layers.qrcode_layer],
            environment={
                "BUCKET_NAME": services.s3.images_bucket.bucket_name,
            },
        )

        services.api_gateway.create_endpoint("POST", "/image/qrcode", function, public=True)

        services.s3.images_bucket.grant_write(function)

```

## Mailer

It's worth noting that in our previous implementation, we deliberately omitted email notifications. This exemplifies one of the advantages of serverless architecture: the ability to completely decouple functions from each other and initiate notifications through events.

This is precisely the approach we're taking with the mailer function. Whenever a file is uploaded to the S3 bucket, an event will be triggered to run this Lambda function. With the assistance of metadata, the mailer Lambda function will be equipped with the necessary information to determine the appropriate email recipients for notifications.

Coming soon...

<!--
Create a bucket per stage

Use the public Pillow layer

self.pillow_layer = \_lambda.LayerVersion.from_layer_version_arn(
scope,
id="PillowLayer",
layer_version_arn="arn:aws:lambda:us-east-2:770693421928:layer:Klayers-p39-pillow:1",
)

Add pillow pillow==10.3.0 to requirements.txt

## Resize

forge function resize --method "POST" --description "Resizes an image and stores it on S3" --belongs-to "images" --public --no-tests --endpoint "images/resize"

## Watermark

forge function watermark --method "POST" --description "Create watermark to the image" --belongs-to "image" --no-tests --public --endpoint "images/resize"

## colorize

forge function colorize --method "POST" --description "Change the colors of the image" --belongs-to "image" --no-tests --public --endpoint "images/resize"

## image to qrcode

We will need to upload the qrcode library ourselves as it doesnt have a public one. link to article on how to do that!

forge function img_to_qrcode --method "POST" --description "Turns image into qr code" --belongs-to "image" --no-tests --public --endpoint "images/resize"

## secrets manager

Configure secrets manager, with a secret with email, password. secrets-manager name: mailer

Create an app password. (Point to article teaching how create an app password)

## mailer

forge function mailer --description "Sends an email when an image enters the bucket" --belongs-to "images" --no-api --no-tests

Mention the approach where we send the env variables as plain texts froms ecrets manager.

Exaplin this is unsafe because exposes the credentiais on the the aws lambda console. a safer way would be to retrieve the values it self inside the function when its running.

But also explain this is a piece of code commonly used. To several lambda functions, why not create a layer to make that smoother ?

Create a simple layer called sm_utils to retrieve the code based on the secret name. -->

```

```

```

```
