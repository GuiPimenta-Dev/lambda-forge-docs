# Building a Real-Time Chat Application with WebSockets in a Serverless Architecture

In this section, we will develop a real-time chat application utilizing WebSockets, facilitating instant communication. This solution is versatile and can be adapted to various scenarios requiring rapid, real-time interactions.

For a deeper dive into WebSockets and to understand how they differ from HTTP, check out the article [Understanding WebSockets: The Real-Time Communication Protocol]().

## Incorporating the Websockets Class into the Services Class

Traditionally, integrating WebSockets involves a significant amount of setup, including configuring the API and establishing various routes to initiate a connection. Fortunately, Forge simplifies this process considerably by offering a template where the connections are pre-configured and interconnected.

```
forge service websockets
```

Upon executing this command a new file is created on the infra/services folder.

This command creates a new file within the `infra/services` directory specifically for managing Websocket connections.

```hl_lines="11"
infra
└── services
    ├── __init__.py
    ├── api_gateway.py
    ├── aws_lambda.py
    ├── dynamo_db.py
    ├── kms.py
    ├── layers.py
    ├── s3.py
    ├── secrets_manager.py
    └── websockets.py
```

Unlike the service files we've encountered previously, the WebSockets class contains an extensive amount of boilerplate code, designed to streamline the process of connecting routes.

```python title="infra/services/websockets.py"
from aws_cdk import aws_iam as iam
from aws_cdk.aws_lambda import CfnPermission
from b_aws_websocket_api.ws_api import WsApi
from b_aws_websocket_api.ws_deployment import WsDeployment
from b_aws_websocket_api.ws_lambda_integration import WsLambdaIntegration
from b_aws_websocket_api.ws_route import WsRoute
from b_aws_websocket_api.ws_stage import WsStage


class Websockets:
    def __init__(self, scope, context, name=None) -> None:
        self.scope = scope
        self.context = context
        self.name = name or context.name

        self.websocket = WsApi(
            scope=self.scope,
            id=f"{self.context.stage}-{self.name}-WebSocket",
            name=f"{self.context.stage}-{self.name}-WebSocket",
            route_selection_expression="$request.body.action",
        )

        self.stage = WsStage(
            scope=self.scope,
            id=f"{self.context.stage}-{self.name}-WSS-Stage",
            ws_api=self.websocket,
            stage_name=context.stage.lower(),
            auto_deploy=True,
        )

        self.deployment = WsDeployment(
            scope=self.scope,
            id=f"{self.context.stage}-{self.name}-Deploy",
            ws_stage=self.stage,
        )

        self.deployment.node.add_dependency(self.stage)

    def create_route(self, route_key, function):
        route_name = route_key.replace("$", "")

        CfnPermission(
            scope=self.scope,
            id=f"{function}-{self.name}-{route_name}-Invoke",
            action="lambda:InvokeFunction",
            function_name=function.function_name,
            principal="apigateway.amazonaws.com",
        )

        function.add_to_role_policy(
            iam.PolicyStatement(
                actions=["execute-api:ManageConnections"],
                resources=["*"],
            )
        )

        integration = WsLambdaIntegration(
            scope=self.scope,
            id=f"{self.context.stage}-{self.name}-Integration-{route_name}",
            integration_name=f"{self.context.stage}-{self.name}-Integration-{route_name}",
            ws_api=self.websocket,
            function=function,
        )

        route = WsRoute(
            scope=self.scope,
            id=f"{self.context.stage}-{self.name}-Route-{route_name}",
            ws_api=self.websocket,
            route_key=route_key,
            authorization_type="NONE",
            route_response_selection_expression="$default",
            target=f"integrations/{integration.ref}",
        )

        self.deployment.node.add_dependency(route)
```

This class is crafted to simplify the traditionally complex process of creating, deploying, and integrating WebSocket APIs. It not only streamlines the setup but also manages the necessary permissions, enabling functions to seamlessly send messages through a WebSocket channel.

To ease the configuration and management of WebSockets, we utilize the open-source library `b_aws_websocket_api`, enhancing our integration capabilities and efficiency.

## Establishing a Connection with the Websocket

To identify the connection IDs for each WebSocket channel, it's essential to inform the client of our application about their respective IDs. This step ensures we can accurately locate the channels as they begin to exchange messages.

Within the AWS environment, we face a specific constraint that we must adhere to: ==We cannot directly send messages to a WebSocket channel from the Lambda function that handles the connection.==

Therefore, we must implement a sequential two-part process. The initial Lambda function, assigned to handle the connection setup, will trigger another Lambda function. This second function is specifically designed with the capability to send messages directly through the WebSocket channel.

Let's first create the function that will actually send the connection id.

```
forge function send_connection_id --description "Sends the connection id to the client when a connection is made" --websocket --belongs-to "chat" --no-tests
```

This command is designed to establish a new function within the `chat` directory.

```
functions
└── chat
    ├── __init__.py
    ├── send_connection_id
    │   ├── __init__.py
    │   ├── config.py
    │   └── main.py
    └── utils
        └── __init__.py
```

Before we proceed, it's important to note a key consideration. Similar to the [URL Shortener]() project, our project operates within a multi-staging environment. This setup requires unique WebSocket URLs for each stage to ensure proper functionality. To manage this, we must specify these distinct URLs in the `cdk.json` file, assigning a unique URL to each stage accordingly.

<div class="admonition note">
    <p class="admonition-title">Note</p>
    <p>If you have configured a custom domain name, you can preemptively specify your URLs. If not, you will need to deploy your code to AWS to obtain the WebSocket URLs. Subsequently, these URLs must be added to the cdk.json file.</p>
</div>

```python title="cdk.json" linenums="51" hl_lines="3 12 21"
   "dev": {
      "base_url": "https://api.lambda-forge.com/dev",
      "post_to_connection_url": "$DEV-POST-TO-CONNECTION-URL",
      "arns": {
        "urls_table": "$DEV-URLS-TABLE-ARN",
        "images_bucket": "$DEV-IMAGES-BUCKET-ARN",
        "auth_table": "$DEV-AUTH-TABLE-ARN"
      }
    },
    "staging": {
      "base_url": "https://api.lambda-forge.com/staging",
      "post_to_connection_url": "$STAGING-POST-TO-CONNECTION-URL",
      "arns": {
        "urls_table": "$STAGING-URLS-TABLE-ARN",
        "images_bucket": "$STAGING-IMAGES-BUCKET-ARN",
        "auth_table": "$STAGING-AUTH-TABLE-ARN"
      }
    },
    "prod": {
      "base_url": "https://api.lambda-forge.com",
      "post_to_connection_url": "$PROD-POST-TO-CONNECTION-URL",
      "arns": {
        "urls_table": "$PROD-URLS-TABLE-ARN",
        "images_bucket": "$PROD-IMAGES-BUCKET-ARN",
        "auth_table": "$PROD-AUTH-TABLE-ARN"
      }
    }
```

This function is going to be very simple, it should simply receive an event with the connection id and send a message to the desired websocket channel.

```python title="functions/chat/send_connection_id/main.py"
import json
import os
import boto3


def lambda_handler(event, context):

    # Retrieve the connection ID from the event
    connection_id = event["connection_id"]

    # Create a client for the API Gateway Management API
    api_gateway_management_client = boto3.client(
        "apigatewaymanagementapi", endpoint_url=os.environ.get("POST_TO_CONNECTION_URL")
    )

    # Send the payload to the WebSocket
    api_gateway_management_client.post_to_connection(
        ConnectionId=connection_id, Data=json.dumps({"connection_id": connection_id}).encode("utf-8")
    )

    return {"statusCode": 200}
```

<div class="admonition warning">
    <p class="admonition-title">Warning</p>
    <p>When working with WebSockets, it's crucial to return the status code in your responses. Failing to do so may lead to errors in your application.</p>
</div>

We need to implement a minor adjustment to the Lambda stack, ensuring it passes the context to the `SendConnectionIdConfig` class. This modification allows the function to dynamically determine the appropriate environment for message delivery.

```python title="infra/stacks/lambda_stack.py" linenums="50" hl_lines="2"
        # Chat
        SendConnectionIdConfig(self.services, context)
```

Now, Let's configure it.

```python title="functions/chat/send_connection_id/config.py" hl_lines="6 13-15 18-23"
from infra.services import Services
from aws_cdk import aws_iam as iam


class SendConnectionIdConfig:
    def __init__(self, services: Services, context) -> None:

        function = services.aws_lambda.create_function(
            name="SendConnectionId",
            path="./functions/chat",
            description="Sends the connection id to the client when a connection is made",
            directory="send_connection_id",
            environment={
              "POST_TO_CONNECTION_URL": context.resources["post_to_connection_url"]
            },
        )

        function.add_to_role_policy(
            iam.PolicyStatement(
                actions=["execute-api:ManageConnections"],
                resources=["*"],
            )
        )
```
