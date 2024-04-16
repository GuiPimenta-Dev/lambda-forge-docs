# Deploying an External Library to AWS Lambda as a Layer

This guide outlines the steps to deploy an external library, such as the qrcode library, to AWS Lambda as a Layer. AWS Lambda Layers serve as a repository for managing common code or data shared across multiple functions. By deploying the `qrcode` library as a Layer, the library can be utilized in various Lambda functions without needing to be included in each function's deployment package.

Although the `qrcode` library is used as an example, this method applies universally to any library you wish to deploy in this manner.

## Setting Up The Environment

```
mkdir packages
cd packages
```

Initialize a virtual environment within this directory and activate it:

```
python3 -m venv venv
source venv/bin/activate
```

Create a directory named `python` within the current directory and navigate into it:

```
mkdir python
cd python
```

It is crucial to name this directory as **python** as it aligns with Lambda Layers' requirements.

Install the qrcode library directly into this directory:

```
pip install qrcode -t .
```

This command uses pip to install the library into the current `python` directory.

After installation, you can attempt to list the directory contents. You should see the installed packages.

## Preparing the Layer Package

Remove unnecessary files, specifically those with the .dist-info extension, to conserve space. These files are not needed for the Lambda Layer:

```
rm -rf *dist-info
```

Return to the parent directory:

```
cd ..
```

Zip the python directory, naming the zip file `qr-code-lambda-package.zip`:

```
zip -r qr-code-lambda-package.zip python
```

You should now have the zip file in your current directory.

Create a s3 bucket and upload your zip file to it:

```
aws s3 cp qr-code-lambda-package.zip s3://your-s3-bucket-name/
```

Verify the upload by checking the S3 bucket and ensuring the zip file is present. Note the object URL for later use.

## Creating and Using the Lambda Layer

Navigate to the AWS Lambda console and select the Layers option.

Click on `Create layer` and input the necessary configuration details. Choose the `Upload a file from Amazon S3` option and paste the URL of the bucket containing the zip file you created earlier.

Finalize by clicking "Add".

That's it! You've successfully deployed the `qrcode` library to AWS Lambda as a Layer.
