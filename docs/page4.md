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

The following code snippet illustrates a basic implementation of an AWS Lambda authorizer function generated automatically by Forge. This example is intended solely for demonstration and learning purposes, and it is critical to devise a comprehensive and secure authentication mechanism suitable for your application's specific security needs. For demonstration, the authorizer checks a custom header for a specific secret value to decide on granting or denying access.

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

## Attaching The Authorizer To The Docs Endpoints

Given that the resources developed in this tutorial serve as public demonstrations of the deployment process, we will not secure the previously created endpoint, allowing it to remain accessible to other readers. Instead, we'll introduce protection by setting up a new Swagger documentation under a separate endpoint.

However, if you prefer, you're welcome to secure the original documentation endpoint instead of establishing a new one.

To integrate the new authorizer or to update an existing docs endpoint to include authorization, navigate to your `infra/stages/deploy.py` file. Here, you will either add a new endpoint for the docs with authorization enabled or update the current one.

The example below shows how to add a new endpoint `/swagger` that is protected by the docs authorizer, while keeping the original docs endpoint public for demonstration purposes:

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

        # Add a new, private docs endpoint at /swagger
        lambda_stack.services.api_gateway.create_docs(enabled=True, authorizer="docs", endpoint="/swagger")
```

Keep in mind that the authorizer name you specify when enabling the docs endpoint must match the exact name assigned to the authorizer within the authorizer configuration class created previously.

```python linenums="6" hl_lines="7" title="authorizers/docs/config.py"
        function = services.aws_lambda.create_function(
            name="DocsAuthorizer",
            path="./authorizers/docs",
            description="Authorizer to be used by swagger"
        )

        services.api_gateway.create_authorizer(function, name="docs", default=False)
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

- Staging: [https://8kwcovaj0f.execute-api.us-east-2.amazonaws.com/staging/swagger](https://8kwcovaj0f.execute-api.us-east-2.amazonaws.com/staging/swagger)
- Prod: [https://s6zqhu2pg1.execute-api.us-east-2.amazonaws.com/prod/swagger](https://s6zqhu2pg1.execute-api.us-east-2.amazonaws.com/prod/swagger)

Attempting to access the above URLs directly will result in the following message:

```json
{
  "Message": "User is not authorized to access this resource with an explicit deny"
}
```

This response confirms that the authorizer is operational, effectively restricting access to unauthorized requests.

However, by including the appropriate secret in your request headers, you can gain access to the documentation. Here's how you can use curl to view the docs:

For Staging:

```title="staging"
curl --request GET \
  --url https://8kwcovaj0f.execute-api.us-east-2.amazonaws.com/staging/swagger \
  --header 'secret: CRMdDRMA4iW4xo9l38pACls7zsHYfp8T7TLXtucysb2lB5XBVFn8' \
```

For Production:

```title="prod"
curl --request GET \
  --url https://s6zqhu2pg1.execute-api.us-east-2.amazonaws.com/prod/swagger \
  --header 'secret: CRMdDRMA4iW4xo9l38pACls7zsHYfp8T7TLXtucysb2lB5XBVFn8'
```

This process demonstrates the effectiveness of the authorizer in safeguarding your documentation, allowing only those with the correct secret to view it.
