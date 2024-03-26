# Building a CRUD Application

Diving deeper into AWS Resources, we're setting out to build a CRUD application that records names and their possible nicknames.

After the user submit a name, the application, through the [Behind The Name API](https://www.behindthename.com/api/help.php), will search for potential nicknames and save them on Dynamo DB.

## Creating an API Key on Behind The Name API

To utilize the Behind The Name API, which enables retrieval of detailed information on names, users must first generate an API key. This key is obtained by registering on the Behind The Name website and requesting access.

Following registration, navigate to [https://www.behindthename.com/api/gateway.php](https://www.behindthename.com/api/gateway.php) to create your API key.

### Store the API Key on AWS Secrets Manager

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

Given that our application's three stages will utilize the same Secrets Manager resource, we can directly integrate the Behind The Name API secret ARN within the SecretsManager class itself.

## Setting Up DynamoDB Tables for Different Stages

Initiate the creation of three distinct DynamoDB tables, each designated for a specific deployment stage:

- Dev-Names
- Staging-Names
- Prod-Names

In this tutorial we are going to use `PK` as Partition Key on our tables.

With the ARNs for each table corresponding to the different stages now in hand, it's time to incorporate them into the `cdk.json` file.

```json title="cdk.json" linenums="51" hl_lines="3 8 13"
    "dev": {
      "arns": {
        "names_table": "$DEV-NAMES-TABLE-ARN"
      }
    },
    "staging": {
      "arns": {
        "names_table": "$STAGING-NAMES-TABLE-ARN"
      }
    },
    "prod": {
      "arns": {
        "names_table": "$PROD-NAMES-TABLE-ARN"
      }
    }
```

### Integrating DynamoDB Service

Just as we incorporated the Secrets Manager, the next step involves adding the DynamoDB service to our Service class for seamless interaction with DynamoDB tables. Execute the command below:

`forge service dynamo_db`

This action generates a new service file, `dynamo_db.py`, located in the `infra/services` directory, further expanding our suite of AWS services:

```
infra
├── services
    ├── __init__.py
    ├── api_gateway.py
    ├── aws_lambda.py
    ├── dynamo_db.py
    └── secrets_manager.p
```

Here's the revised edition of our Service class reflecting the latest updates:

```python title="infra/services/__init__.py"
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
```

This is the new DynamoDB class recently created.

```python title="infra/services/dynamo_db.py"
from aws_cdk import aws_dynamodb as dynamo_db
from aws_cdk import aws_iam as iam


class DynamoDB:
    def __init__(self, scope, resources: dict) -> None:

        self.dynamo = dynamo_db.Table.from_table_arn(
            scope,
            "Dynamo",
            resources["arns"]["dynamo_arn"],
        )

    @staticmethod
    def add_query_permission(function, table):
        function.add_to_role_policy(
            iam.PolicyStatement(
                actions=["dynamodb:Query"],
                resources=[f"{table.table_arn}/index/*"],
            )
        )
```

In DynamoDB development, querying data is a fundamental operation. Notably, the DynamoDB class is equipped with a helper method designed to simplify the process of granting query permissions. However, considering that our current project does not require querying capabilities, let's just remove this method. Furthermore, we should refine the class variables to directly reference our Names table.

```python title="infra/services/dynamo_db.py" hl_lines="7-11"
from aws_cdk import aws_dynamodb as dynamo_db


class DynamoDB:
    def __init__(self, scope, resources: dict) -> None:

        self.names_table = dynamo_db.Table.from_table_arn(
            scope,
            "NamesTable",
            resources["arns"]["names_table"],
        )
```

Ensure that the resource ARN precisely matches the name specified in your `cdk.json` file.

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

With all services in place, it's time to create our Lambda functions.

## Developing the Create Function

Now we'll develop the "Create" component of our CRUD application, focusing on adding names and their nicknames to our DynamoDB tables. Execute the following Forge CLI command to create a Lambda function designed for this task:

```

forge function create_name --method "POST" --description "Create a name and its respective nicknames on Dynamo DB" --belongs names --public

```

The command instructs Forge to establish a new Lambda function, `create_name`, aimed at processing POST requests. Utilizing the `--belongs` flag, Forge is directed to categorize this function within the `names` folder, highlighting its connection to a group of related functions.

```

functions
├── names
├── create_name
│ ├── **init**.py
│ ├── config.py
│ ├── integration.py
│ ├── main.py
│ └── unit.py
└── utils
└── **init**.py

```

- `names/` This directory acts as the container for all Lambda functions related to name operations, organizing them under a common theme.
- `create_name/` This subdirectory is dedicated to the function for creating names, equipped with all necessary files for its execution, configuration, and testing.
- `utils/` A utility directory for shared functions or helpers that support the operations within the names functions, enhancing code reuse and maintainability.

### Enhanced Overview of Create Name Endpoint

The Create Name endpoint is designed to enrich the data around a given name by fetching its associated nicknames from the "Behind the Name" API. It further consolidates this information by storing the original name along with its nicknames in a DynamoDB table, each entry uniquely identified by a UUID. This process not only aggregates relevant data for future retrieval but also standardizes name-related insights within the database.

Now, let's delve into the details of the function implementation.

```python title="functions/names/create_name/main.py"
import json
from dataclasses import dataclass
import json
import uuid
import os
import boto3
import requests

@dataclass
class Input:
    name: str


@dataclass
class Output:
    name_id: str


def lambda_handler(event, context):
    dynamodb = boto3.resource("dynamodb")
    NAMES_TABLE_NAME = os.environ.get("NAMES_TABLE_NAME")
    names_table = dynamodb.Table(NAMES_TABLE_NAME)

    secrets_manager = boto3.client("secretsmanager")
    BEHIND_THE_NAME_SECRET_NAME = os.environ.get("BEHIND_THE_NAME_SECRET_NAME")
    BEHIND_THE_NAME_API_KEY = secrets_manager.get_secret_value(SecretId=BEHIND_THE_NAME_SECRET_NAME)["SecretString"]

    body = json.loads(event["body"])
    name = body["name"]

    url = f"https://www.behindthename.com/api/related.json?name={name}&key={BEHIND_THE_NAME_API_KEY}"
    response = requests.get(url)

    if "error_code" in response.text:
        return {"statusCode": 500, "body": json.dumps({"message": response.text})}

    name_id = str(uuid.uuid4())
    nicknames = response.json()["names"]
    names_table.put_item(Item={"PK": name_id, "name": name, "nicknames": nicknames})

    return {"statusCode": 200, "body": json.dumps({"name_id": name_id})}
```

This function interacts both with the `Behind the Name` API and an `AWS DynamoDB table`. It begins by extracting a name from the incoming event's body, then uses this name to query the API for related nicknames. If the API call is successful, it generates a unique identifier (UUID) for this name, and stores the name along with its nicknames in a DynamoDB table.

Let's develop a configuration class to streamline the lambda function's access to necessary resources. This class will centralize the management of environment variables and resource configurations, thereby enhancing code maintainability and readability. It ensures that all external resources such as DynamoDB tables and API keys are easily configurable and securely accessed within the lambda function.

```python title="functions/names/create_name/config.py" hl_lines="12-16 21 22"
from infra.services import Services


class CreateNameConfig:
    def __init__(self, services: Services) -> None:

        function = services.aws_lambda.create_function(
            name="CreateName",
            path="./functions/names",
            description="Create a name and its respective nicknames on Dynamo DB",
            directory="create_name",
            layers=[services.layers.requests_layer],
            environment={
                "NAMES_TABLE_NAME": services.dynamo_db.names_table.table_name,
                "BEHIND_THE_NAME_SECRET_NAME": services.secrets_manager.behind_the_name_secret.secret_name,
            }
        )

        services.api_gateway.create_endpoint("POST", "/names", function, public=True)

        services.dynamo_db.names_table.grant_write_data(function)
        services.secrets_manager.behind_the_name_secret.grant_read(function)
```

Overall, the `CreateNameConfig` class meticulously prepares the lambda function with the necessary tools and permissions for secure and efficient operation.

This tutorial is dedicated to explain the architecture and operational intricacies of the Lambda Forge framework. In our quest for clarity and conciseness, we purposefully sidestep unit and integration testing discussions to avert inundating readers with too much detail. However, rest assured, the comprehensive project code, inclusive of approaches for mocking AWS resources in unit tests, will be hosted on GitHub. This deliberate choice ensures that enthusiasts desiring to dive into testing techniques can do so on their terms, fostering a learning environment that is both focused and comprehensive.
