# Private Endpoints

Given our current setup, all endpoints are accessible via the internet, which may or may not align with the intended use case of your application.

Let's proceed to learn how to configure these endpoints to be private.

First, let's begin by creating a new authorizer function with the following command:

```
forge authorizer docs --description "Authorizer for Swagger Documentation"
```

This command instructs the forge CLI tool to create a new authorizer function named docs.

## Authorizer Structure

Authorizers, while closely resembling Lambda Functions in structure, fulfill a distinct role. Their primary function is to act as an intermediary layer that authenticates requests made to Lambda Functions, ensuring that only authorized requests are processed.

Let's examine the structure of an authorizer more closely:

```
authorizers
├── __init__.py
├── docs
│   ├── __init__.py
│   ├── config.py
│   ├── main.py
│   └── unit.py
└── utils
    └── __init__.py
```

- `authorizers/` This directory serves as the central hub for all authorizer functions, analogous to how the `functions/` directory houses Lambda functions. Each distinct authorizer is allocated its own subdirectory within this folder.
- `docs/` The `docs` subdirectory is specifically designed for the authorizer related to the 'docs' endpoint. It includes everything needed for the authorizer to authenticate requests, manage configurations, and perform testing.
- `__init__.py` Marks the directory as a Python package, enabling its modules to be imported elsewhere within the project.
- `config.py` Contains the configuration settings for the authorizer, such as environmental variables and access control parameters. Keeping the configuration separate from the core logic is a best practice that enhances code maintainability and adaptability.
- `main.py` Houses the main logic for the authorizer, detailing how incoming requests are verified. This file is where you define the procedures for credential validation and access authorization.
- `unit.py` Focused on unit testing for the authorizer, these tests ensure that each part of the authorizer's code operates as expected independently, which is essential for early bug detection and reliable functionality.
- `utils/` Provides utility functions that are used by the authorizers, offering common functionalities or resources that can be leveraged across various authorizers to facilitate development and maintenance.

### Configuring Your Authorizer

Similar to lambda functions in terms of setup, authorizers diverge in their application. Instead of establishing an endpoint on API Gateway, an authorizer is configured to control access to one or more endpoints.

```{.py3 title="authorizers/docs/config.py" hl_lines="12" linenums="1"}
from infra.services import Services

class DocsAuthorizerConfig:
    def __init__(self, services: Services) -> None:

        function = services.aws_lambda.create_function(
            name="DocsAuthorizer",
            path="./authorizers/docs",
            description="Authorizer for Swagger Documentation"
        )

        services.api_gateway.create_authorizer(function, name="docs", default=False)
```

Actually, Lambda Forge treats all lambda functions as **private** by default. That's why we had to use the `--public` flag in our initial forge command to make the function accessible without authentication. Without this flag, we would have been required to implement an authorizer for user authentication.

### Implementing The Authorizer

Forge automatically generates a basic implementation of an AWS Lambda authorizer. This example is intended solely for demonstration and learning purposes, and it is critical to devise a comprehensive and secure authentication mechanism suitable for your application's specific security needs. For demonstration, the authorizer checks a custom header for a specific secret value to decide on granting or denying access.

**Important Note**: The example below employs a simple secret key for authorization, which is not recommended for production environments. It is crucial to replace this logic with a robust, secure authorization strategy before deploying your application.

```python title="authorizers/docs/main.py"
def lambda_handler(event, context):

    # ATTENTION: The example provided below is strictly for demonstration purposes and should NOT be deployed in a production environment.
    # It's crucial to develop and integrate your own robust authorization mechanism tailored to your application's security requirements.
    # To utilize the example authorizer as a temporary placeholder, ensure to include the following header in your requests:

    # Header:
    # secret: CRMdDRMA4iW4xo9l38pACls7zsHYfp8T7TLXtucysb2lB5XBVFn8

    # Remember, security is paramount. This placeholder serves as a guide to help you understand the kind of information your custom authorizer should authenticate.
    # Please replace it with your secure, proprietary logic before going live. Happy coding!

    secret = event["headers"].get("secret")

    SECRET = "CRMdDRMA4iW4xo9l38pACls7zsHYfp8T7TLXtucysb2lB5XBVFn8"
    effect = "allow" if secret == SECRET else "deny"

    policy = {
        "policyDocument": {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Action": "execute-api:Invoke",
                    "Effect": effect,
                    "Resource": "*"
                }
            ],
        },
    }
    return policy
```

As illustrated in the code snippet above, the authorizer is designed to check for a specific header named `secret`, expecting it to contain the key `CRMdDRMA4iW4xo9l38pACls7zsHYfp8T7TLXtucysb2lB5XBVFn8`.

This key serves as a simple form of authentication, granting or denying access based on its presence and accuracy in the request headers.

The token mentioned is automatically generated by Forge, meaning the specific token you encounter during your implementation will differ from the example provided. Please be mindful of this distinction as you proceed.

## Adding Authorizer To Lambda Stack

Just like the functions, an authorizer needs to be initialized within the LambdaStack.

Fortunately, Forge takes care of this automatically for you.

```python title="infra/stacks/lambda_stack.py" hl_lines="18"
from aws_cdk import Stack
from constructs import Construct
from infra.services import Services
from lambda_forge import release
from authorizers.docs.config import DocsAuthorizerConfig
from functions.hello_world.config import HelloWorldConfig


@release
class LambdaStack(Stack):
    def __init__(self, scope: Construct, context, **kwargs) -> None:

        super().__init__(scope, f"{context.name}-Lambda-Stack", **kwargs)

        self.services = Services(self, context)

        # Authorizers
        DocsAuthorizerConfig(self.services)

        # HelloWorld
        HelloWorldConfig(self.services)
```

## Attaching The Authorizer To The Docs Endpoints

Given that the resources developed in this tutorial serve as public demonstrations of the deployment process, we will not secure the previously created endpoint, allowing it to remain accessible to other readers. Instead, we'll introduce protection by setting up a new Swagger documentation under a separate endpoint.

However, if you prefer, you're welcome to secure the original documentation endpoint instead of establishing a new one.

To integrate the new authorizer or to update an existing docs endpoint to include authorization, navigate to your `infra/stages/deploy.py` file. Here, you will either add a new endpoint for the docs with authorization enabled or update the current one.

The example below shows how to add a new endpoint `/docs/private` that is protected by the docs authorizer, while keeping the original docs endpoint public for demonstration purposes:

```python title="infra/stages/deploy.py" hl_lines="17"
import aws_cdk as cdk
from constructs import Construct

from infra.stacks.lambda_stack import LambdaStack


class DeployStage(cdk.Stage):
    def __init__(self, scope: Construct, context, **kwargs):
        super().__init__(scope, context.stage, **kwargs)

        lambda_stack = LambdaStack(self, context)

        # Keep the original docs endpoint public
        lambda_stack.services.api_gateway.create_docs(enabled=True, authorizer=None)

        # Add a new, private docs endpoint at /docs/private
        lambda_stack.services.api_gateway.create_docs(enabled=True, authorizer="docs", endpoint="/docs/private")
```

Keep in mind that the authorizer you specify when enabling the docs endpoint must match the exact name assigned to the authorizer within the authorizer configuration class created previously.

```python linenums="6" hl_lines="7" title="authorizers/docs/config.py"
        function = services.aws_lambda.create_function(
            name="DocsAuthorizer",
            path="./authorizers/docs",
            description="Authorizer to be used by swagger"
        )

        services.api_gateway.create_authorizer(function, name="docs")
```

## Publish Your Changes to GitHub

With all components now properly configured, the next step is to publish your updates to GitHub. Execute the following commands to add, commit, and push your changes across the various branches, ensuring your repository reflects the latest state of your project:

```bash
# Stage all changes for commit
git add .

# Commit your changes with a descriptive message
git commit -m "Implemented private documentation endpoint"

# Push the changes to the 'dev' branch
git push origin dev

# Switch to the 'staging' branch, merge changes from 'dev', and push
git checkout staging
git merge dev
git push origin staging

# Switch to the 'main' branch, merge changes from 'staging', and push, completing the workflow
git checkout main
git merge staging
git push origin main
```

Once the deployment pipelines conclude, you'll have access to the newly secured documentation endpoint, protected by the authorizer.

- Staging: [https://8kwcovaj0f.execute-api.us-east-2.amazonaws.com/staging/docs/private](https://8kwcovaj0f.execute-api.us-east-2.amazonaws.com/staging/docs/private)
- Prod: [https://s6zqhu2pg1.execute-api.us-east-2.amazonaws.com/prod/docs/private](https://s6zqhu2pg1.execute-api.us-east-2.amazonaws.com/prod/docs/private)

Attempting to access the above URLs directly will result in the following message:

```json
{
  "Message": "User is not authorized to access this resource with an explicit deny"
}
```

This response confirms that the authorizer is operational, effectively restricting access to unauthorized requests.

However, by including the appropriate secret in your request headers, you can gain access to the documentation.

To view the documentation, copy the following cURL commands and paste them into your preferred API testing tool, such as Insomnia, Postman, or any other tool of your choice:

For Staging:

```title="Staging"
curl --request GET \
  --url https://8kwcovaj0f.execute-api.us-east-2.amazonaws.com/staging/docs/private \
  --header 'secret: CRMdDRMA4iW4xo9l38pACls7zsHYfp8T7TLXtucysb2lB5XBVFn8'
```

For Production:

```title="Prod"
curl --request GET \
  --url https://s6zqhu2pg1.execute-api.us-east-2.amazonaws.com/prod/docs/private \
  --header 'secret: CRMdDRMA4iW4xo9l38pACls7zsHYfp8T7TLXtucysb2lB5XBVFn8'
```

This process demonstrates the effectiveness of the authorizer in safeguarding your documentation, allowing only those with the correct secret to view it.

## Default Authorizer

As mentioned before, Lambda Forge treats all functions as **private** by default. Consequently, unless explicitly declared public, functions are presumed to necessitate an authorizer for access control.

To streamline the process and eliminate the need to assign an authorizer to each Lambda function individually, you can designate a single authorizer as the default. This approach ensures that all non-public Lambda functions automatically inherit this default authorizer, simplifying the setup for access control.

To establish a default authorizer, use the following command:

```
forge authorizer default --description "Default Authorizer" --default
```

This command configures a new authorizer named `default` within Forge, marking it as the default option. Consequently, any Lambda functions not explicitly associated with a different authorizer will automatically use this default authorizer for access control.

Upon executing the command to create a default authorizer, a new directory structure is established under the authorizers folder, mirroring the organized approach taken for other components in the project. The structure now includes a dedicated folder for the `default` authorizer, alongside the `docs` authorizer.

```
authorizers
├── __init__.py
├── default
│   ├── __init__.py
│   ├── config.py
│   ├── main.py
│   └── unit.py
├── docs
│   ├── __init__.py
│   ├── config.py
│   ├── main.py
│   └── unit.py
└── utils
    └── __init__.py
```

Let's examine the details of the `DefaultAuthorizerConfig` class recently created by Forge.

```python title="authorizers/default/config.py" hl_lines="12" linenums="1"
from infra.services import Services

class DefaultAuthorizerConfig:
    def __init__(self, services: Services) -> None:

        function = services.aws_lambda.create_function(
            name="DefaultAuthorizer",
            path="./authorizers/default",
            description="Default Authorizer"
        )

        services.api_gateway.create_authorizer(function, name="default", default=True)
```

The `default=True` parameter on line 12 explicitly designates this authorizer as the default for all non-public Lambda functions, automatically applying it as their access control mechanism.

Just like the docs authorizer, Forge has created a new secret key for the default authorizer. For this tutorial, the header expected in the request is:

**`secret`**: **`Jmat02QiRNLTRVRWSUxBoljTxzpnHnzZcz0iFAXY4s1vgvO8m36q`**

## Private Function

Now let's create a new private function.

```
Forge function private --method "GET" --description "A private function"
```

Upon creating a new private function using Forge with the specified command, the project's function structure is expanded to include this newly private function alongside the existing ones.

```
functions
├── __init__.py
├── hello_world
│   ├── __init__.py
│   ├── config.py
│   ├── integration.py
│   ├── main.py
│   └── unit.py
└── private
    ├── __init__.py
    ├── config.py
    ├── integration.py
    ├── main.py
    └── unit.py
```

Let's examine the PrivateConfig class that Forge has generated for us.

```python title="functions/private/config.py"
from infra.services import Services

class PrivateConfig:
    def __init__(self, services: Services) -> None:

        function = services.aws_lambda.create_function(
            name="Private",
            path="./functions/private",
            description="A private function",
        )

        services.api_gateway.create_endpoint("GET", "/private", function)
```

Within this configuration class, we are establishing a new endpoint to handle a GET request at the `/private` path. Importantly, there's no clear declaration of this function as public, nor is an authorizer explicitly defined for it. Nonetheless, due to the prior configuration of a default authorizer, this function will automatically fall under its protection.

This approach underscores the utility and efficiency of setting a default authorizer safeguarding new functions by default, thereby enhancing security without necessitating manual authorizer configuration for each new endpoint.

Let's make some adjustments to the response returned by this Lambda function:

```python title="functions/private/main.py" linenums="13" hl_lines="5"
def lambda_handler(event, context):

    return {
        "statusCode": 200,
        "body": json.dumps({"message": "Hello From Private!"})
    }
```

Additionally, let's revise the unit tests and the integration tests to accurately represent the modifications we've implemented in our code.

```python title="functions/private/unit.py" hl_lines="8"
import json
from .main import lambda_handler

def test_lambda_handler():

    response = lambda_handler(None, None)

    assert response["body"] == json.dumps({"message": "Hello From Private!"})
```

```python title="functions/private/integration.py" hl_lines="10 22"
import pytest
import requests
from lambda_forge.constants import BASE_URL

@pytest.mark.integration(method="GET", endpoint="/private")
def test_private_status_code_with_no_header_is_403():

    response = requests.get(url=f"{BASE_URL}/private")

    assert response.status_code == 403


@pytest.mark.integration(method="GET", endpoint="/private")
def test_private_status_code_with_valid_header_is_200():

    headers = {
        "secret": "Jmat02QiRNLTRVRWSUxBoljTxzpnHnzZcz0iFAXY4s1vgvO8m36q"
    }

    response = requests.get(url=f"{BASE_URL}/private", headers=headers)

    assert response.status_code == 200
```

Next, let's proceed to upload our updates to GitHub.

```bash
# Add all changes to the staging area
git add .

# Commit the staged changes with a clear message
git commit -m "Implemented a private function with default authorizer"

# Push the committed changes to the 'dev' branch
git push origin dev

# Transition to the 'staging' branch to integrate the latest developments
git checkout staging
git merge dev
git push origin staging

# Finally, update the 'main' branch with the changes from 'staging' and push the update to complete the deployment process
git checkout main
git merge staging
git push origin main
```

Following the successful execution of our deployment pipelines, our private lambda function is now live:

- Staging: [https://8kwcovaj0f.execute-api.us-east-2.amazonaws.com/staging/private](https://8kwcovaj0f.execute-api.us-east-2.amazonaws.com/staging/private)
- Prod: [https://s6zqhu2pg1.execute-api.us-east-2.amazonaws.com/prod/private](https://s6zqhu2pg1.execute-api.us-east-2.amazonaws.com/prod/private)

Attempting to access these URLs directly via your web browser will result in the following message, indicating unauthorized access:

```json
{
  "Message": "User is not authorized to access this resource with an explicit deny"
}
```

However, by including the required secret in the header of your request, you can successfully retrieve the content. Here's how you can use curl to access the deployed Lambda function in both environments:

```title="Staging"
curl --request GET \
  --url https://8kwcovaj0f.execute-api.us-east-2.amazonaws.com/staging/private \
  --header 'secret: Jmat02QiRNLTRVRWSUxBoljTxzpnHnzZcz0iFAXY4s1vgvO8m36q'
```

```title="Prod"
curl --request GET \
  --url https://s6zqhu2pg1.execute-api.us-east-2.amazonaws.com/prod/private \
  --header 'secret: Jmat02QiRNLTRVRWSUxBoljTxzpnHnzZcz0iFAXY4s1vgvO8m36q'
```

This demonstrates the effectiveness of our authorizer in securing the private Lambda function, allowing access only to those with the correct secret header.

## Using Specific Authorizers for Endpoints

In case you need to secure an endpoint with a particular authorizer, you can achieve this by specifying the authorizer's name during its setup in the configuration class.

Here’s how you would configure a specific authorizer for an endpoint:

```python title="functions/private/config.py" hl_lines="13"
from infra.services import Services

class PrivateConfig:
    def __init__(self, services: Services) -> None:

        function = services.aws_lambda.create_function(
            name="Private",
            path="./functions/private",
            description="A private function",
        )

        # Specify the 'docs' authorizer for the '/private' endpoint
        services.api_gateway.create_endpoint("GET", "/private", function, authorizer="docs")
```

By implementing this configuration, the `/private` function would be secured using the same authorizer as the `/docs` endpoints.

Please note, this change is presented for illustrative purposes to demonstrate how to apply a non-default authorizer. Consequently, we will not commit this alteration and will continue to secure the `/private` endpoint with the default authorizer.
