# Image Processing with AWS S3, Secrets Manager and SMTP Email Delivery

In this section, we'll delve into the creation of four distinct projects centered around image processing. These projects include: `Image Resizing`, `Watermarking`, `Color Filters`, and `Converting an Image into a QR Code`. Upon user submission of a request, the image undergoes processing. Once processed, the file is saved on Amazon S3 and promptly dispatched via email, allowing users to conveniently access the results.

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

For image processing, we'll utilize the Pillow library, widely used for working with images, and the requests library to download content from user-provided URLs. Public ARNs for both libraries are available [here](https://api.klayers.cloud//api/v2/p3.9/layers/latest/us-east-2/json).

The ARN we require is listed below:

- Pillow: `arn:aws:lambda:us-east-2:770693421928:layer:Klayers-p39-pillow:1`
- Requests: `arn:aws:lambda:us-east-2:770693421928:layer:Klayers-p39-requests:19`

Now, let's update the Layers class to include the Pillow layer as one of its variables.

```python title="infra/services/layers.py" hl_lines="8-12 14-18"
from aws_cdk import aws_lambda as _lambda
from lambda_forge import Path


class Layers:
    def __init__(self, scope) -> None:

        self.pillow_layer = _lambda.LayerVersion.from_layer_version_arn(
            scope,
            id="PillowLayer",
            layer_version_arn="arn:aws:lambda:us-east-2:770693421928:layer:Klayers-p39-pillow:1",
        )

        self.requests_layer = _lambda.LayerVersion.from_layer_version_arn(
            scope,
            id="RequestsLayer",
            layer_version_arn="arn:aws:lambda:us-east-2:770693421928:layer:Klayers-p39-requests:19",
        )
```

It's essential to include the both libraries in our `requirements.txt` file to ensure it's installed when deploying our application.

```title="requirements.txt" linenums="15"
pillow==10.3.0
requests==2.28.1
```

## Resize

This function will be designed to accept three parameters from the user: `url`, denoting a URL leading to an image; `email`, specifying the recipient email to which we'll be sending the file as a response; and `dimensions`, indicating the desired size to which the user wishes to resize the image.

Let's dive into building this functionality.

```
forge function resize --method "POST" --description "Resizes an image and stores it on S3" --belongs-to "images" --public --no-tests --endpoint "images/resize"
```

Upon executing this command, the following structure is generated.

```
functions
└── images
    ├── resize
    │   ├── __init__.py
    │   ├── config.py
    │   └── main.py
    └── utils
        └── __init__.py
```

Let's them create the resize funcionality.

```python title="functions/images/resize/main.py"
import hashlib
import json
import os
import uuid
from dataclasses import dataclass
from io import BytesIO

import boto3
import requests
from PIL import Image


@dataclass
class Input:
    url: str
    email: str
    dimensions: str


@dataclass
class Output:
    message: str


def lambda_handler(event, context):

    # Retrieve the S3 bucket name from environment variables
    bucket_name = os.environ.get("BUCKET_NAME")

    # Parse the input event to get the URL and the email body
    body = json.loads(event["body"])

    url = body.get("url")
    email = body.get("email")
    dimensions = body.get("dimensions", "100x100")

    # if dimension dont follow the correct format, return an error
    if dimensions.count("x") != 1:
        return {"statusCode": 400, "message": "Invalid dimensions format"}

    # Download the image
    response = requests.get(url)
    img = Image.open(BytesIO(response.content))

    # Initialize the S3 client
    s3_client = boto3.client("s3")

    # Resize the image as needed
    width, height = dimensions.split("x")
    img_resized = img.resize((int(width), int(height)))

    # Convert the resized image to bytes
    img_byte_arr = BytesIO()
    img_resized.save(img_byte_arr, format=img.format)
    img_byte_arr = img_byte_arr.getvalue()

    # create the file name with a uuid
    file_name = f"{uuid.uuid4()}.jpg"

    # Upload the resized image to S3
    s3_client.put_object(
        Bucket=bucket_name,
        Key=file_name,
        Body=img_byte_arr,
        Metadata={"url": url, "email": email},
    )

    return {"statusCode": 200, "message": "Image resized and uploaded successfully"}
```

This Lambda function retrieves an image from a given URL, resizes it based on specified dimensions, and uploads the resized image to an S3 bucket while attaching metadata including the original URL and recipient email.

Now, let's proceed with the configuration.

```python title="functions/images/resize/config.py"
from infra.services import Services


class ResizeConfig:
    def __init__(self, services: Services) -> None:

        function = services.aws_lambda.create_function(
            name="Resize",
            path="./functions/image",
            description="Resizes an image and stores it on S3",
            directory="resize",
            environment={
                "BUCKET_NAME": services.s3.images_bucket.bucket_name,
            },
        )

        services.api_gateway.create_endpoint("POST", "/images/resize", function, public=True)

        services.s3.images_bucket.grant_write(function)
```

## Watermark

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
