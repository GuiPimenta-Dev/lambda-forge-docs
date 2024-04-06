# Developing a Serverless CRUD App Using DynamoDB

In this section, we will develop a straightforward CRUD application designed to capture and manage user-defined names and ages, each uniquely identified by a UUID. This approach not only simplifies the demonstration of the architecture's capabilities but also emphasizes the practical application of these technologies in a user-centric scenario.

## Building the Create Feature

Next, we'll focus on constructing the "Create" functionality of our CRUD application. This feature is dedicated to inputting names and their corresponding ages into our DynamoDB tables. To initiate the creation of a Lambda function tailored for this operation, run the following command in the Forge CLI:

```

forge function create_user --method "POST" --description "Create a user with name and age on Dynamo DB" --belongs-to users --public

```

This command signals to Forge the need to generate a new Lambda function named create_user, which will handle POST requests. By applying the `--belongs-to` flag, we guide Forge to organize this function within the `users` directory, emphasizing its role as part of a suite of user-related functionalities.

```
functions/users
├── create_user
│   ├── __init__.py
│   ├── config.py
│   ├── integration.py
│   ├── main.py
│   └── unit.py
└── utils
    └── __init__.py
```

- `users/` This directory acts as the container for all Lambda functions related to users operations, organizing them under a common theme.
- `create_user/` This subdirectory is dedicated to the function for creating users, equipped with all necessary files for its execution, configuration, and testing.
- `utils/` A utility directory for shared functions or helpers that support the operations within the users functions, enhancing code reuse and maintainability.

### Core Logic

The Create User endpoint serves as the gateway for adding new users to our system. It processes incoming data from the request body, assigns a unique UUID to each user, and then stores this information in DynamoDB.
Now, let's delve into the details of the function implementation.

```python title="functions/users/create_user/main.py"
import json
import uuid
from dataclasses import dataclass
import os
import boto3


@dataclass
class Input:
    name: str
    age: int


@dataclass
class Output:
    id: str


def lambda_handler(event, context):
    # Retrieve the DynamoDB table name from environment variables.
    USERS_TABLE = os.environ.get("USERS_TABLE")

    # Initialize a DynamoDB resource.
    dynamodb = boto3.resource("dynamodb")

    # Reference the DynamoDB table.
    users_table = dynamodb.Table(USERS_TABLE)

    # Parse the request body to get user data.
    body = json.loads(event["body"])

    # Generate a unique ID for the new user.
    user_id = str(uuid.uuid4())

    # Insert the new user into the DynamoDB table.
    users_table.put_item(Item={"PK": user_id, "name": body["name"], "age": body["age"]})

    # Return a successful response with the newly created user ID.
    return {"statusCode": 200, "body": json.dumps({"user_id": user_id})}
```

### Configuration Class

Let's develop a configuration class to streamline the lambda function's access to necessary resources. This class will centralize the management of environment variables and resource configurations, thereby enhancing code maintainability and readability. It ensures that all external resources such as DynamoDB tables are easily configurable and securely accessed within the lambda function.

```python title="functions/users/create_user/config.py" hl_lines="12-14 19"
from infra.services import Services


class CreateUserConfig:
    def __init__(self, services: Services) -> None:

        function = services.aws_lambda.create_function(
            name="CreateUser",
            path="./functions/users",
            description="Create a user with name and age on Dynamo DB",
            directory="create_user",
            environment={
                "USERS_TABLE_NAME": services.dynamo_db.users_table.table_name,
            },
        )

        services.api_gateway.create_endpoint("POST", "/users", function, public=True)

        services.dynamo_db.users_table.grant_write_data(function)
```

## Building the Read Feature

We're now set to construct the read feature, enabling the retrieval of user details using their ID.

To facilitate this, we'll utilize the following command:

```
forge function get_user --method "GET" --description "Retrieve user information by ID" --belongs-to users --endpoint "/users/{user_id}" --public
```

The `--endpoint "/users/{user_id}"` parameter sets up a specific URL path for accessing this function. This path includes a dynamic segment {user_id} that gets replaced by the actual ID of the user we're trying to retrieve information about when the function is called.

By running this command, we add a new layer to our application that specifically handles fetching user details in an organized, accessible manner.

```
functions/users
├── conftest.py
├── create_user
│   ├── __init__.py
│   ├── config.py
│   ├── integration.py
│   ├── main.py
│   └── unit.py
├── get_user
│   ├── __init__.py
│   ├── config.py
│   ├── integration.py
│   ├── main.py
│   └── unit.py
└── utils
    └── __init__.py
```

### Core Logic

This segment of our application demonstrates the retrieval of user information from a DynamoDB table through an AWS Lambda function. It highlights how to parse API gateway events, interact with DynamoDB, and structure responses for efficient data delivery.

```python title="functions/users/get_user/main.py"
import json
import os
import boto3
from dataclasses import dataclass

@dataclass
class Path:
    user_id: str

@dataclass
class Input:
    pass

@dataclass
class Output:
    name: str
    age: int

def lambda_handler(event, context):
    # Retrieve the name of the DynamoDB table from environment variables.
    USERS_TABLE_NAME = os.environ.get("USERS_TABLE_NAME")

    # Initialize a DynamoDB resource using boto3.
    dynamodb = boto3.resource("dynamodb")

    # Reference the specific DynamoDB table by name.
    users_table = dynamodb.Table(USERS_TABLE_NAME)

    # Extract the user ID from the pathParameters provided in the event object.
    user_id = event["pathParameters"].get("user_id")

    # Retrieve the user item from the DynamoDB table using the extracted ID.
    user = users_table.get_item(Key={"PK": user_id}).get("Item")

    # Reformat the user item into the desired output structure.
    user = {"name": user["name"], "age": user["age"]}

    # Return the user data with a 200 status code, ensuring the body is properly JSON-encoded.
    return {"statusCode": 200, "body": json.dumps(user, default=str)}
```

### Configuration Class

The config class below outlines the configuration necessary for establishing the GetUser function within AWS, illustrating the seamless integration of AWS Lambda and API Gateway to expose a user data retrieval endpoint.

```python title="functions/users/get_user/config.py"
from infra.services import Services


class GetUserConfig:
    def __init__(self, services: Services) -> None:

        function = services.aws_lambda.create_function(
            name="GetUser",
            path="./functions/users",
            description="Retrieve user information by ID",
            directory="get_user",
            environment={
                "USERS_TABLE_NAME": services.dynamo_db.users_table.table_name,
            },
        )

        services.api_gateway.create_endpoint(
            "GET", "/users/{user_id}", function, public=True
        )

        services.dynamo_db.users_table.grant_read_data(function)
```

## Building the Update Feature

Let's utilize Forge once again to swiftly establish a tailored structure, setting the stage for our Update User functionality.

```
forge function update_user --method "PUT" --description "Update an user by ID" --belongs-to users --endpoint "/users/{user_id}" --public
```

As expected, after using the forge command to generate the `update_user` function, a predefined directory structure is created.

```
functions/users
├── conftest.py
├── create_user
│   ├── __init__.py
│   ├── config.py
│   ├── integration.py
│   ├── main.py
│   └── unit.py
├── get_user
│   ├── __init__.py
│   ├── config.py
│   ├── integration.py
│   ├── main.py
│   └── unit.py
├── update_user
│   ├── __init__.py
│   ├── config.py
│   ├── integration.py
│   ├── main.py
│   └── unit.py
└── utils
    └── __init__.py
```

### Core Logic

Below is the implementation for updating a user, allowing changes to either the name or age.

```python title="functions/users/update_user/main.py"
import json
from dataclasses import dataclass
import os
import boto3


@dataclass
class Path:
    user_id: str


@dataclass
class Input:
    name: str
    age: int


@dataclass
class Output:
    message: str

def lambda_handler(event, context):
    # Retrieve the DynamoDB table name from environment variables set in the Lambda configuration
    USERS_TABLE_NAME = os.environ.get("USERS_TABLE_NAME")

    # Initialize a DynamoDB resource using boto3, AWS's SDK for Python
    dynamodb = boto3.resource("dynamodb")

    # Reference the DynamoDB table using the retrieved table name
    users_table = dynamodb.Table(USERS_TABLE_NAME)

    # Extract the user ID from the pathParameters of the event object passed to the Lambda
    user_id = event["pathParameters"].get("user_id")

    # Parse the JSON body from the event object to get the user data
    body = json.loads(event["body"])

    # Update the specified user item in the DynamoDB table with the provided name and age
    users_table.put_item(Item={"PK": user_id, "name": body["name"], "age": body["age"]})

    # Return a response indicating successful user update, with a 200 HTTP status code
    return {
        "statusCode": 200,
        "body": json.dumps({"message": "User updated"}, default=str),
    }
```

### Configuration Class

Here's the configuration needed for the `update user` function to properly engage with the essential AWS services.

```python title="functions/users/update_user/config.py"
from infra.services import Services

class UpdateUserConfig:
  def __init__(self, services: Services) -> None:

    function = services.aws_lambda.create_function(
        name="UpdateUser",
        path="./functions/users",
        description="Update an User",
        directory="update_user",
        environment={
            "USERS_TABLE_NAME": services.dynamo_db.users_table.table_name,
        },
    )

    services.api_gateway.create_endpoint(
        "PUT", "/users/{user_id}", function, public=True
    )

    services.dynamo_db.users_table.grant_write_data(function)
```

## Building the Delete Feature

Now, to complete our CRUD application, let's proceed with constructing the Delete User endpoint.

```
forge function delete_user --method "DELETE" --description "Delete an user by ID" --belongs-to users --endpoint "/users/{user_id}" --public
```

Upon executing the Forge command, the `delete_user` folder will appear within the `infra/users` directory.

```
functions/users
├── conftest.py
├── create_user
│   ├── __init__.py
│   ├── config.py
│   ├── integration.py
│   ├── main.py
│   └── unit.py
├── delete_user
│   ├── __init__.py
│   ├── config.py
│   ├── integration.py
│   ├── main.py
│   └── unit.py
├── get_user
│   ├── __init__.py
│   ├── config.py
│   ├── integration.py
│   ├── main.py
│   └── unit.py
├── update_user
│   ├── __init__.py
│   ├── config.py
│   ├── integration.py
│   ├── main.py
│   └── unit.py
└── utils
    └── __init__.py
```

### Core Logic

Below is the streamlined code for removing a user from DynamoDB using their user ID.

```python title="functions/users/delete_user/main.py"
import json
from dataclasses import dataclass
import os
import boto3

@dataclass
class Path:
    user_id: str

@dataclass
class Input:
    pass

@dataclass
class Output:
    message: str


def lambda_handler(event, context):
    # Fetch the name of the DynamoDB table from the environment variables.
    USERS_TABLE_NAME = os.environ.get("USERS_TABLE_NAME")

    # Initialize a DynamoDB resource using the boto3 library.
    dynamodb = boto3.resource("dynamodb")

    # Reference the DynamoDB table by its name.
    users_table = dynamodb.Table(USERS_TABLE_NAME)

    # Extract the user ID from the path parameters in the event object.
    user_id = event["pathParameters"].get("user_id")

    # Delete the item with the specified user ID from the DynamoDB table.
    users_table.delete_item(Key={"PK": user_id})

    # Return a response indicating that the user has been successfully deleted, with a 200 HTTP status code.
    return {"statusCode": 200, "body": json.dumps({"message": "User deleted"})}
```

### Configuration Class

Here's how to set up the `delete user` function for interaction with the required AWS resources.

```python title="functions/users/delete_user/config.py"
from infra.services import Services


class DeleteUserConfig:
    def __init__(self, services: Services) -> None:

        function = services.aws_lambda.create_function(
            name="DeleteUser",
            path="./functions/users",
            description="Delete an User",
            directory="delete_user",
            environment={
                "USERS_TABLE_NAME": services.dynamo_db.users_table.table_name,
            },
        )

        services.api_gateway.create_endpoint(
            "DELETE", "/users/{user_id}", function, public=True
        )

        services.dynamo_db.users_table.grant_write_data(function)
```

## Deploying Our Serverless CRUD Application

Fantastic, with our four fundamental operations in place, we're ready for deployment to AWS.

As a quick refresher, deploying a Lambda Function requires initializing the config class within the LambdaStack class's constructor. Fortunately, Forge automates this process for us. Now, let's examine how our LambdaStack has evolved after our extensive interactions with Forge.

```python title="infra/stacks/lambda_stack.py"
from aws_cdk import Stack
from constructs import Construct
from infra.services import Services
from lambda_forge import release
from functions.users.delete_user.config import DeleteUserConfig
from functions.users.update_user.config import UpdateUserConfig
from functions.users.get_user.config import GetUserConfig
from functions.users.create_user.config import CreateUserConfig
from functions.private.config import PrivateConfig
from authorizers.default.config import DefaultAuthorizerConfig
from authorizers.docs.config import DocsAuthorizerConfig
from functions.hello_world.config import HelloWorldConfig

@release
class LambdaStack(Stack):
    def __init__(self, scope: Construct, context, **kwargs) -> None:

        super().__init__(scope, f"{context.name}-Lambda-Stack", **kwargs)

        self.services = Services(self, context)

        # Users
        DeleteUserConfig(self.services)
        UpdateUserConfig(self.services)
        GetUserConfig(self.services)
        CreateUserConfig(self.services)
```

Impressively, Forge has neatly arranged all related Config classes for optimal cohesion.

As observed, all four operations have been successfully initialized in our lambda stack, enabling us to move forward by pushing our code to GitHub and awaiting the completion of the CI/CD process. Following this, we should have a fully functional and operational CRUD application at our disposal.

```bash
# Send your changes to stage
git add .

# Commit with a descriptive message
git commit -m "Developing a CRUD with DynamoDB"

# Push changes to the 'dev' branch
git push origin dev

# Merge 'dev' into 'staging' and push
git checkout staging
git merge dev
git push origin staging

# Finally, merge 'staging' into 'main' and push
git checkout main
git merge staging
git push origin main
```

![Dev pipeline running](images/three_pipelines.png)

In this tutorial, the generated base URLs for each environment are:

- **Dev**: `https://gxjca0e395.execute-api.us-east-2.amazonaws.com/dev`
- **Staging**: `https://8kwcovaj0f.execute-api.us-east-2.amazonaws.com/staging`
- **Prod**: `https://s6zqhu2pg1.execute-api.us-east-2.amazonaws.com/prod`

For simplicity, we'll focus on demonstrating the processes in the production stage. However, these operations can be similarly conducted using the base URLs for other environments.

```title="Prod - Create User"
curl --request POST \
  --url https://s6zqhu2pg1.execute-api.us-east-2.amazonaws.com/prod/users \
  --data '{
	"name": "John Doe",
	"age": 30
}'
```

```title="Prod - Get User"
curl --request GET \
  --url https://s6zqhu2pg1.execute-api.us-east-2.amazonaws.com/prod/users/$USER-ID
```

```title="Prod - Update User"
curl --request PUT \
  --url https://s6zqhu2pg1.execute-api.us-east-2.amazonaws.com/prod/users/$USER-ID \
  --data '{
	"name": "John Doe",
	"age": 31
}'
```

```title="Prod - Delete User"
curl --request DELETE \
  --url https://s6zqhu2pg1.execute-api.us-east-2.amazonaws.com/prod/users/$USER-ID
```

Congratulations! 🎉 You've successfully deployed your very first Serverless application using DynamoDB and Lambda Forge across three different stages! 🚀👩‍💻