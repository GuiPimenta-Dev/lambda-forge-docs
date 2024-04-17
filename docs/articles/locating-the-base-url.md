# Locating The Api Gateway Base URL on CloudFormation

When deploying APIs using CloudFormation in AWS, it's essential to locate the base URL of your API Gateway. This base URL serves as the entry point for accessing the various resources and endpoints defined within your API.

## Steps to Find the Base URL:

1. **Navigate to the AWS CloudFormation Console:** Begin by logging into the AWS Management Console and navigating to the CloudFormation service.

2. **Select the Stack:** In the CloudFormation dashboard, select the stack corresponding to the deployment of your API Gateway.

3. **View Stack Outputs:** Once the stack is selected, navigate to the "Outputs" tab. Here, you will find a list of key-value pairs representing various outputs generated during the stack creation process.

4. **Locate the Base URL Output:** Look for an output key that provides the base URL of your API Gateway. This key-value pair typically has a description indicating its purpose, such as "APIGatewayBaseUrl" or "ApiGatewayEndpoint."

5. **Note the Base URL:** Take note of the value associated with the base URL output key. This value represents the URL endpoint through which your API can be accessed.

6. **Test the Base URL:** To verify the correctness of the base URL, you can copy it and paste it into a web browser or API testing tool. Attempt to access one of the endpoints defined within your API to ensure proper connectivity.

## Conclusion:

Locating the base URL of your API Gateway on CloudFormation is a straightforward process that involves navigating to the CloudFormation console, selecting the appropriate stack, and viewing the stack outputs. By following these steps, you can easily find and verify the base URL needed to interact with your API endpoints deployed via CloudFormation.
