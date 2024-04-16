# Finding the API Gateway Base URL

This guide will walk you through the steps to locate the base URL for the API Gateway, essential for interacting with your deployed functions. Our focus will be on the function named `Staging-Lambda-Forge-Demo-HelloWorld`.

![alt text](images/staging-hello-world.png)

First, navigate to the function in question. Then, access `Configurations -> Triggers` to uncover the URL generated upon deployment.

![alt text](images/staging-hello-world-api-gateway-trigger.png)

For the purposes of our tutorial, the relevant URL is as follows:

- [https://8kwcovaj0f.execute-api.us-east-2.amazonaws.com/staging/hello_world](https://8kwcovaj0f.execute-api.us-east-2.amazonaws.com/staging/hello_world)

The BASE URL, vital for API interactions, is identified as the URL segment **before** the `/hello_world` endpoint. For our example, it's:

`https://8kwcovaj0f.execute-api.us-east-2.amazonaws.com/staging`

With the base URL now in your possession, you're well-equipped to begin integrating your services, paving the way for seamless communication and functionality between your applications and the AWS infrastructure.
