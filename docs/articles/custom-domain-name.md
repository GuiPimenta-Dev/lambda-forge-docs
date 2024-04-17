# How to Configure a Custom Domain Name for API Gateway

Configuring a custom domain name for your API Gateway allows you to present a professional and brand-consistent URL to your users. This step-by-step guide will walk you through the process of setting up a custom domain name for your API Gateway in AWS.

## Prerequisites

Before you begin, make sure you have the following:

1. An AWS account.
2. A deployed API in API Gateway.
3. A registered domain name. You can use Amazon Route 53 or any other domain registrar.
4. An SSL certificate for your custom domain name in AWS Certificate Manager (ACM). This is required for HTTPS.

## Step 1: Request a Certificate in AWS Certificate Manager

1. **Go to the AWS Certificate Manager**: In the AWS Management Console, navigate to ACM.
2. **Request a Certificate**: Click on “Request a certificate” and choose “Request a public certificate”.
3. **Add your domain names**: Enter your custom domain name. You can add multiple names if needed.
4. **Choose validation method**: You can validate your domain ownership via DNS or email. DNS validation is recommended for its simplicity and speed.
5. **Review and request**: Review your details and click “Confirm and request”.

## Step 2: Validate Your Domain

- **For DNS Validation**: Add the CNAME record provided by ACM to your DNS configuration. This process varies depending on your DNS provider.
- **For Email Validation**: Check the email associated with your domain registration and follow the instructions in the email from AWS.

## Step 3: Create a Custom Domain Name in API Gateway

1. **Navigate to API Gateway**: In the AWS Management Console, go to API Gateway.
2. **Create Custom Domain Name**: Click on “Custom Domain Names” in the sidebar, then “Create”.
3. **Configure your domain name**: Enter your domain name and select the ACM certificate you created earlier.
4. **Set up Endpoint Configuration**: Choose the endpoint type. You can choose from an “Edge-optimized” (default and recommended for global clients) or “Regional” (if your users are primarily in one region) endpoint.
5. **Save the Custom Domain Name**: Click on “Save” to create your custom domain name.

## Step 4: Configure the Base Path Mapping

1. **Select your custom domain name**: From the list of custom domain names, click on the one you just created.
2. **Create a new Base Path Mapping**: Click on the “Base Path Mappings” section and then “Add new base path”.
3. **Set up the Base Path**: Choose the destination API and stage for your custom domain. The base path allows you to direct traffic to different APIs or stages from the same domain.
4. **Save your Base Path Mapping**: Click on “Save”.

## Step 5: Update Your DNS Records

1. **Get the API Gateway domain name**: After saving your custom domain name in API Gateway, you'll get a target domain name. This is different from your custom domain.
2. **Create a CNAME record**: In your domain’s DNS settings, create a CNAME record pointing your custom domain to the target domain name provided by API Gateway.

## Step 6: Test Your Custom Domain

- After your DNS changes propagate, test your custom domain by sending requests to your API through the new domain name.

## Conclusion

You have successfully configured a custom domain name for your API Gateway. This not only enhances your API's branding but also provides a more secure and professional way to present your services to the world.

If you encounter any issues, AWS documentation and support forums are great resources for troubleshooting and getting additional help.
