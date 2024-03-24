# Forge CLI

Forge is a command-line interface (CLI) tool that simplifies the process of creating the folder structure mentioned in the previous session. With Forge, you can easily create a fully configured lambda function with the required structure and all the necessary configurations needed for deployment by running just one command in your terminal.

Creating a new lambda function is easy with Forge. Just run the following command:

`$ forge function $FUNCTION_NAME --method $METHOD --description $DESCRIPTION`

This command creates a new lambda function with the specified name, method, and description, and sets up the required folder structure for you with all the necessary configurations pre-set for an easy deployment. Here is an example on how the folder structure will look like:

```
functions/
└── $FUNCTION_NAME/
    ├── __init__.py
    ├── config.py
    ├── integration.py
    ├── main.py
    └── unit.py
```

If you want to share code across multiple lambda functions in the same folder, simply add the `--belongs` flag and specify the folder name:

`$ forge function $FUNCTION_NAME --method $METHOD --description $DESCRIPTION --belongs $FOLDER`

This will create the following folder structure:

```
functions/
└── $FOLDER/
    ├── __init__.py
    ├── $FUNCTION_NAME/
    │   ├── __init__.py
    │   ├── config.py
    │   ├── integration.py
    │   ├── main.py
    │   └── unit.py
    └── utils/
        └── __init__.py
```

This command enables you to specify the folder to which the lambda function belongs, making it easy to share code across different functions.

Finally, if you want to see a list of available commands and their descriptions, simply run:

`$ forge --help`

Forge automatically attach your lambda function to the LambdaStack class.
