# **Bananajs CLI**

A command-line interface (CLI) tool to create a new Bananajs app with different configurations, such as MongoDB or SQL-based setups. This CLI helps you quickly set up a project with your desired backend configuration.

## **Table of Contents**

- Installation
- Usage
- Available Configurations
- Example
- License

## **Installation**

To get started with Bananajs CLI, you'll need to install it globally on your system. You can install it using npm or yarn.

### **Install globally with npm:**

```
npm install -g @banana-universe/bananajs-cli
```

### **Or install it as a dev dependency:**

```
npm install --save-dev @banana-universe/bananajs-cli
```

## **Usage**

Once the CLI is installed, you can use it to create a new app by running the following command:

```
bananajs new
```

The tool will prompt you to input the name of your app and select a configuration type.

**Prompt Flow:**

- **App Name:** You will be asked to provide a name for your app. The default name is my-bananajs-app.
- **Configuration Type:** You can choose between the following configurations:
  - **MongoDB**: Use this configuration to set up an app with MongoDB as the backend.
  - **SQL**: Choose this configuration if you prefer an SQL-based backend.

Once you have selected the configuration, the CLI will create the app directory and set up the project for you.

## **Available Configurations**

Currently, the following app configurations are available:

- MongoDB: A setup for apps using MongoDB as the database.
- SQL: A setup for apps using a SQL-based database (like MySQL, PostgreSQL, etc.).

More configurations can be added in the future based on user demand.

## **Example**

Here’s an example of how to create a new app with the bananajs-cli:

1. Run the command:

```
bananajs new
```

2. You will be prompted to enter the name of the app and choose the configuration:

```
What is the name of your app? (default: my-bananajs-app)

Which app configuration do you want? (choices: MongoDB, SQL)
```

3. Once you’ve entered your app name and chosen a configuration, the tool will create the app directory and set it up based on your selection.
4. You should see success messages like:

```
App "my-new-app" has been successfully created.
```

5. If an app already exists with the provided name, the CLI will notify you:

```
An app with the name "my-new-app" already exists.
```

6. If you select an unsupported configuration, it will show an error message like:

```
Unsupported app configuration: SQL.
```

## **License**

This project is licensed under the MIT License.
