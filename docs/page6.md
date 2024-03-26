<!-- ### Store the API Key on AWS Secrets Manager

Store the API key in **AWS Secrets Manager** to prevent the key from being hard-coded into your application's source code, enhancing security and maintaining the confidentiality of your API key.

## Integrating Secrets Manager into Your Lambda Service

To enable interaction with AWS Secrets Manager within our Lambda functions, it's essential to incorporate it into our Service class. This ensures accessibility across all configuration files.

Execute the command below to add Secrets Manager as a new service:

```
forge service secrets_manager
```

Upon running this command, a new `secrets_manager.py` file will be generated within the `infra/services` directory, enriching the existing service structure.

```
infra
├── services
    ├── __init__.py
    ├── api_gateway.py
    ├── aws_lambda.py
    └── secrets_manager.py
```

Additionally, the Services class found in `infra/services/__init__.py` will be automatically updated to include an instance of the newly created `SecretsManager` class, facilitating seamless integration and usage of Secrets Manager in your Lambda functions.

```python title="infra/services/__init__.py" hl_lines="10"
from infra.services.secrets_manager import SecretsManager
from infra.services.api_gateway import APIGateway
from infra.services.aws_lambda import AWSLambda


class Services:
    def __init__(self, scope, context) -> None:
        self.api_gateway = APIGateway(scope, context)
        self.aws_lambda = AWSLambda(scope, context)
        self.secrets_manager = SecretsManager(scope, context.resources)
```

This is what the recently introduced SecretsManager class looks like:

```python title="infra/services/secrets_manager.py"
from aws_cdk import aws_secretsmanager as secrets_manager


class SecretsManager:
    def __init__(self, scope, resources) -> None:

        self.secrets_manager = secrets_manager.Secret.from_secret_complete_arn(
            scope,
            id="SecretsManager",
            secret_complete_arn=resources["arns"]["secrets_manager_arn"],
        )
```

To streamline access to the Behind The Name API within our application, let's update our class variable to make use of the respective secret stored on Secrets Manager.

```python title="infra/services/secrets_manager.py" hl_lines="7-12"
from aws_cdk import aws_secretsmanager as secrets_manager


class SecretsManager:
    def __init__(self, scope, resources) -> None:

        self.behind_the_name_secret = secrets_manager.Secret.from_secret_complete_arn(
            scope,
            id="BehindTheNameSecret",
            secret_complete_arn="$SECRET-ARN",
        )
```

## Creating The Requests Layer

A crucial requirement for our application is to make HTTP requests to the Behind The Name API, which necessitates the use of the requests library. As this library isn't included in the standard Python environment for AWS Lambda, we need to incorporate it through a custom Lambda layer.

Similarly to the other services, let's create it with Forge.

`forge service layers`

As expected, the layers are already added to the Service class.

```python title="infra/services/__init__.py"
from infra.services.layers import Layers
from infra.services.dynamo_db import DynamoDB
from infra.services.secrets_manager import SecretsManager
from infra.services.api_gateway import APIGateway
from infra.services.aws_lambda import AWSLambda


class Services:
    def __init__(self, scope, context) -> None:
        self.api_gateway = APIGateway(scope, context)
        self.aws_lambda = AWSLambda(scope, context)
        self.secrets_manager = SecretsManager(scope, context.resources)
        self.dynamo_db = DynamoDB(scope, context.resources)
        self.layers = Layers(scope)
```

The requests library, due to its popularity, is available as a public layer for AWS Lambda, making it easier to include in your projects without creating a custom layer.

We'll utilize a specific ARN for the requests library provided by Klayers for Python 3.9. You can find a list of public layers [here](https://github.com/Jeff-Junfang/Klayers-aws-layer-).
.

`arn:aws:lambda:us-east-2:770693421928:layer:Klayers-p39-requests:19`.

Let's add the `requests` layer to our Layers class.

```python title="infra/services/layers.py" hl_lines="7-11"
from aws_cdk import aws_lambda as _lambda


class Layers:
    def __init__(self, scope) -> None:

        self.requests_layer = _lambda.LayerVersion.from_layer_version_arn(
            scope,
            id="RequestsLayer",
            layer_version_arn="arn:aws:lambda:us-east-2:770693421928:layer:Klayers-p39-requests:19",
        )
```

With all services in place, it's time to create our Lambda functions. -->
