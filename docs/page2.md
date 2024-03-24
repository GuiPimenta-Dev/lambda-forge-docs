# Function Structure

### Directory Structure for Lambda Functions

Lambda functions should adhere to a consistent directory structure to ensure proper organization and deployment. The structure for a Lambda function is as follows:

```
functions/
└── hello_world/
    ├── __init__.py
    ├── config.py
    ├── integration.py
    ├── main.py
    └── unit.py
```

- `__init__.py` initializes the Python package.
- `config.py` contains the configuration for resources used by the function.
- `integration.py` includes the integration tests for the lambda function.
- `main.py` is where the source code of the Lambda function resides.
- `unit.py` contains unit tests for the function and its helper functions.

### Lambda Function Code Example

The `main.py` file should contain your Lambda function's code. Here is an example for a simple **HelloWorld** function:

```python
import json
from dataclasses import dataclass

@dataclass
class Input:
    pass

@dataclass
class Output:
    message: str

def lambda_handler(event, context):

    return {
        "statusCode": 200,
        "body": json.dumps({"message": "Hello World!"})
    }
```

## Configuration and Deployment

The config.py file is used to manage essential resources for your Lambda function. An example setup is shown below where we create a lambda function and trigger it with API Gateway:

```python
from infra.services import Services

class HelloWorldConfig:
    def __init__(self, services: Services) -> None:

        function = services.aws_lambda.create_function(
            name="HelloWorld",
            path="./functions/hello_world",
            description="A simple hello world"
        )

        services.api_gateway.create_endpoint("GET", "/hello_world", function)
```

To actually deploy your Lambda Function, you need to add the **HelloWorldConfig** class to the **LambdaStack** in the `infra/stacks/lambda_stack.py` file.

```python
from aws_cdk import Stack
from constructs import Construct
from infra.services import Services
from lambda_forge import release
from functions.hello_world.config import HelloWorldConfig


@release
class LambdaStack(Stack):
    def __init__(self, scope: Construct, context, **kwargs) -> None:

        super().__init__(scope, f"{context.name}-CDK", **kwargs)

        self.services = Services(self, context)

        # HelloWorld
        HelloWorldConfig(self.services)
```
