# pm2-windows-service

Allows easily installing and uninstalling [PM2](https://github.com/Unitech/PM2/) as a service on Windows machines - inspired by [pm2-windows-startup](https://github.com/marklagendijk/node-pm2-windows-startup), and largely achieved using [node-windows](https://github.com/coreybutler/node-windows).

```sh
npm i pm2-windows-service -g
```

**NOTE:** pm2-windows-service currently requires node v4.0.0+, if node v0.12.x support is a requirement for you, please post in [this issue](https://github.com/jon-hall/pm2-windows-service/issues/2).

### Install and Uninstall the Service

> TIP: Run these from an administrative command prompt to avoid getting hit with a bunch of UAC dialogs

```sh
pm2-service-install [-n <service name>] [--unattended]

pm2-service-uninstall
```

The install command also offers to perform some basic setup for you which helps address some of the [caveats](#caveats) detailed below.

### Quickstart

_After reading the [caveats section](#caveats)_, use PM2 to start the set of processes that you want the service to restore, and then just do:

```sh
pm2 save
```

The service will then restart that set of processes when the service is next started (by default this will be on system boot).

### Configuration

You can control what the PM2 service runs using the `PM2_SERVICE_SCRIPTS` environment variable, which should be set to a semi-colon separated list of javascript files and/or [json config files](http://pm2.keymetrics.io/docs/usage/application-declaration/) to run when the service starts (using `pm2 start`).

If `PM2_SERVICE_SCRIPTS` is not set, then the default behaviour is to call [`pm2 resurrect`](http://pm2.keymetrics.io/docs/usage/pm2-doc-single-page/#related-commands) on service startup - when PM2 is running with the list of processes you want launched by the service, use [`pm2 save`](http://pm2.keymetrics.io/docs/usage/pm2-doc-single-page/#related-commands) to dump the process list, ready for the service to restore it when it next starts.

### **Caveats**

While testing this, a few caveats have arisen which need to be detailed upfront, as they can lead to issues when PM2 is installed as a service:

-   If you don't have the `PM2_HOME` environment variable set (in such a way that it is available to the service user - the simplest being set it at machine level), you might find PM2 attempting to run in strange directories. To resolve this, make sure you set the environment variable and restart the service - though see the comment just below about the location it points to being accessible for the service user.
-   If you run the service under one user account, and then attempt to interact with PM2 from the command line using a different account, you'll find things don't work as expected if the `PM2_HOME` environment variable contains any ["user context" env vars](https://technet.microsoft.com/en-us/library/cc749104.aspx#BKMK_2) (`%APPDATA%`, `%USERPROFILE%` etc.), or if one of the users cannot access the location of `PM2_HOME`.
    -   To avoid this problem, either **_set `PM2_HOME` to an absolute path that all potential users (service and CLI) can write to_**, _or_ **_run the service under the same account as you intend to use the CLI from_**.
-   It also seems PM2 throws an error when you try to use the CLI from a _non-administrative command prompt_ after it has been launched as a service, regardless of which user the service runs under (not tested with a non-admin user, yet).
    -   Currently, the workaround for this, unfortunately, is just **_use an administrative command prompt_** if you need to access PM2 via command line when it is running as a service.
-   As raised in [#24](https://github.com/jon-hall/pm2-windows-service/issues/24), there appears to be a dependency on **_having .NET 3.5 installed_** on the machine on which the service runs (and this holds true even when later versions are installed, you still need 3.5 as well) - this issue is still under investigation but, while that's happening, this is something to bear in mind when setting up the service.
-   Lastly, when launching json config files using `PM2_SERVICE_SCRIPTS`, problems arise if the apps declared in the config file don't explicitly have a `cwd` set (it ends up being the home dir of the service user).
    -   `pm2-windows-service` attempts to solve this issue for you by **_automatically defaulting the `cwd` property to the directory of the config file when it isn't explicitly set_**, if this is an issue for you then explicitly setting the `cwd` for your apps might be what you need to do.

### Logs

The service created by node-windows is currently placed in `<global npm packages directory>/node_modules/pm2-windows-service/src/daemon/`, as such, this is also where you will find the log output from the service, should you need it.
